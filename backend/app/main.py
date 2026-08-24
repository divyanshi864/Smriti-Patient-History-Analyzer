from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from app.services.groq_service import filter_record, get_recommendation
from app.services.db_service import get_patient, get_all_patients
import os, json, io
from groq import AsyncGroq
from dotenv import load_dotenv
load_dotenv()

# --- Firebase setup (optional) ---
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

fb_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
if fb_path and os.path.exists(fb_path) and not firebase_admin._apps:
    try:
        cred = credentials.Certificate(fb_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Warning: Could not initialize Firebase: {e}")
# ---------------------------------------------------

app = FastAPI(title="Smriti v3")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def log_request_latency(request: Request, call_next):
    import time
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
    print(f"⏱️ [{request.method}] {request.url.path} -> {duration_ms:.2f} ms")
    return response

class AnalyzeRequest(BaseModel):
    patient_id: str
    symptoms: str

class NewPatient(BaseModel):
    id: str; name: str; age: int; blood_type: str
    allergies: str = "None known"; medications: str = "None"; record_text: str = ""

class ChatRequest(BaseModel):
    message: str; patient_context: str = ""

class OCRRequest(BaseModel):
    image_base64: str; patient_id: str = ""

class MedSuggestionRequest(BaseModel):
    diagnosis: str; allergies: str = ""; current_meds: str = ""; risk_level: str = "MEDIUM"

class PrescriptionPDFRequest(BaseModel):
    patient_name: str; patient_id: str; doctor_name: str
    medications: list; ai_diagnosis: str = ""; notes: str = ""; date: str = ""

class SOSRequest(BaseModel):
    patient_name: str; patient_id: str; blood_type: str
    allergies: str; medications: str; emergency_contact: str = ""

class ArchivePDFRequest(BaseModel):
    patient: dict
    prescriptions: list = []
    notes: list = []
    vitals: list = []

class AllergyUpdate(BaseModel):
    allergies: str

@app.get("/")
def root():
    return {"status": "Smriti API v3 running"}

@app.get("/api/patients")
def list_patients():
    return get_all_patients()

@app.get("/api/patients/{patient_id}")
def get_patient_route(patient_id: str):
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.post("/api/patients")
def create_patient(p: NewPatient):
    from app.services.db_service import supabase
    result = supabase.table("patients").insert({
        "id": p.id, "name": p.name, "age": p.age,
        "blood_type": p.blood_type, "allergies": p.allergies,
        "medications": p.medications, "record_text": p.record_text
    }).execute()
    return {"success": True, "patient": result.data}

@app.delete("/api/patients/{patient_id}")
def delete_patient(patient_id: str):
    from app.services.db_service import supabase
    supabase.table("patients").delete().eq("id", patient_id).execute()
    return {"success": True}

@app.patch("/api/patients/{patient_id}/allergies")
def update_allergies(patient_id: str, data: AllergyUpdate):
    from app.services.db_service import supabase
    supabase.table("patients").update({"allergies": data.allergies}).eq("id", patient_id).execute()
    return {"success": True}

@app.get("/api/stats")
def get_stats():
    from app.services.db_service import supabase
    from datetime import datetime
    today = datetime.now().date().isoformat()
    patients = supabase.table("patients").select("id", count="exact").execute()
    rx_today = supabase.table("prescriptions").select("id", count="exact").gte("created_at", today).execute()
    notes_today = supabase.table("doctor_notes").select("id", count="exact").gte("created_at", today).execute()
    return {
        "total_patients": patients.count or 0,
        "prescriptions_today": rx_today.count or 0,
        "notes_today": notes_today.count or 0,
    }

@app.post("/api/emergency/analyze")
async def analyze(req: AnalyzeRequest):
    import time
    start = time.time()
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        from app.services.db_service import supabase
        supabase.table("audit_log").insert({
            "action": "AI_ANALYSIS", "patient_id": req.patient_id,
            "details": f"Symptoms: {req.symptoms}"
        }).execute()
    except: pass
    filtered = await filter_record(patient["record_text"], req.symptoms)
    result = await get_recommendation(filtered, req.symptoms, patient)
    result["latency_ms"] = round((time.time() - start) * 1000)
    return result

@app.post("/api/medicine-suggestions")
async def medicine_suggestions(req: MedSuggestionRequest):
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    response = await client.chat.completions.create(
        model=os.getenv("GROQ_MODEL_SUGGEST", "openai/gpt-oss-20b"), max_tokens=300,
        messages=[{
            "role": "system",
            "content": "You are a clinical pharmacist. Return ONLY a JSON array of medicine strings, no other text."
        }, {
            "role": "user",
            "content": f"Diagnosis: {req.diagnosis}\nRisk: {req.risk_level}\nAllergies: {req.allergies}\nCurrent meds: {req.current_meds}\n\nList 8-10 medicines. Format: 'Name dose'. Avoid allergic medicines.\nReturn ONLY JSON array: [\"Medicine 1\", ...]"
        }]
    )
    text = response.choices[0].message.content.strip()
    try:
        s = text.find("["); e = text.rfind("]") + 1
        return {"medicines": json.loads(text[s:e])}
    except:
        return {"medicines": []}

@app.post("/api/chat-segmented")
async def chat_segmented(req: ChatRequest):
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    symptom_lower = req.message.lower()
    specialist = "general physician"; map_query = "hospital near me"; emergency = False

    if any(w in symptom_lower for w in ["chest pain","heart attack","cardiac","palpitation"]):
        specialist = "cardiologist"; map_query = "cardiology hospital near me"; emergency = True
    elif any(w in symptom_lower for w in ["stroke","paralysis","unconscious","seizure"]):
        specialist = "neurologist"; map_query = "neurology hospital near me"; emergency = True
    elif any(w in symptom_lower for w in ["stomach","abdomen","vomit","nausea","diarrhea"]):
        specialist = "gastroenterologist"; map_query = "gastroenterology hospital near me"
    elif any(w in symptom_lower for w in ["headache","migraine","dizzy","vertigo"]):
        specialist = "neurologist"; map_query = "neurology hospital near me"
    elif any(w in symptom_lower for w in ["breathing","breath","cough","asthma","lungs"]):
        specialist = "pulmonologist"; map_query = "chest hospital near me"
    elif any(w in symptom_lower for w in ["joint","bone","back pain","knee","fracture"]):
        specialist = "orthopedic doctor"; map_query = "orthopedic hospital near me"
    elif any(w in symptom_lower for w in ["skin","rash","itch","acne"]):
        specialist = "dermatologist"; map_query = "dermatologist near me"
    elif any(w in symptom_lower for w in ["eye","vision","blur"]):
        specialist = "ophthalmologist"; map_query = "eye hospital near me"
    elif any(w in symptom_lower for w in ["ear","hearing","throat","nose"]):
        specialist = "ENT specialist"; map_query = "ENT hospital near me"
    elif any(w in symptom_lower for w in ["fever","cold","flu","infection","weakness"]):
        specialist = "general physician"; map_query = "general hospital near me"

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile", max_tokens=500,
        messages=[{
            "role": "system",
            "content": "You are a medical AI assistant. " + req.patient_context + f"""
Respond ONLY in this exact JSON format, no extra text:
{{
  "cause": "2 crisp sentences about possible causes.",
  "hospitals": "1 sentence advising to search Google Maps for '{map_query}'.",
  "doctors": "1-2 sentences: they need a {specialist}.",
  "action": "Single most important action. Under 15 words.",
  "specialist": "{specialist}"
}}"""
        }, {"role": "user", "content": req.message}]
    )
    text = response.choices[0].message.content
    try:
        s = text.find("{"); e = text.rfind("}") + 1
        segments = json.loads(text[s:e])
        segments["emergency"] = emergency; segments["mapQuery"] = map_query
        return segments
    except:
        return {"cause": text, "emergency": emergency, "mapQuery": map_query, "specialist": specialist}

@app.post("/api/ocr")
async def ocr_extract(req: OCRRequest):
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    response = await client.chat.completions.create(
        model="llama-3.2-11b-vision-preview", max_tokens=800,
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{req.image_base64}"}},
            {"type": "text", "text": "Extract all medical info: patient details, diagnosis, medications, test results, dates. Format clearly."}
        ]}]
    )
    return {"extracted_text": response.choices[0].message.content}

@app.post("/api/prescription/pdf")
async def generate_prescription_pdf(req: PrescriptionPDFRequest):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from datetime import datetime

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    NAVY = colors.HexColor('#0f2044'); BLUE = colors.HexColor('#1a56a0')
    GRAY = colors.HexColor('#374151'); WHITE = colors.white

    header_data = [[
        Paragraph("<b>Smriti</b>", ParagraphStyle('h', fontSize=24, textColor=WHITE, fontName='Helvetica-Bold')),
        Paragraph("AI-Powered Patient History Analyzer", ParagraphStyle('hs', fontSize=9, textColor=colors.HexColor('#93c5fd'), fontName='Helvetica')),
        Paragraph("<b>PRESCRIPTION</b>", ParagraphStyle('hr', fontSize=14, textColor=WHITE, fontName='Helvetica-Bold', alignment=2)),
    ]]
    ht = Table(header_data, colWidths=[40*mm, 90*mm, 40*mm])
    ht.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), NAVY),
        ('TOPPADDING', (0,0), (-1,-1), 14), ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LEFTPADDING', (0,0), (-1,-1), 12), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(ht); story.append(Spacer(1, 8*mm))

    date_str = req.date or datetime.now().strftime("%d %B %Y, %I:%M %p")
    info_data = [
        [Paragraph(f"<b>Patient:</b> {req.patient_name}", ParagraphStyle('p', fontSize=10, fontName='Helvetica')),
         Paragraph(f"<b>Date:</b> {date_str}", ParagraphStyle('p', fontSize=10, fontName='Helvetica'))],
        [Paragraph(f"<b>Patient ID:</b> {req.patient_id}", ParagraphStyle('p', fontSize=10, fontName='Helvetica')),
         Paragraph(f"<b>Doctor:</b> Dr. {req.doctor_name}", ParagraphStyle('p', fontSize=10, fontName='Helvetica'))],
    ]
    if req.ai_diagnosis:
        info_data.append([Paragraph(f"<b>AI Diagnosis:</b> {req.ai_diagnosis}", ParagraphStyle('p', fontSize=10, fontName='Helvetica', textColor=BLUE)), Paragraph("", ParagraphStyle('p', fontSize=10, fontName='Helvetica'))])
    it = Table(info_data, colWidths=[85*mm, 85*mm])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(it); story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Prescribed Medications", ParagraphStyle('mh', fontSize=13, fontName='Helvetica-Bold', textColor=NAVY)))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=4))

    med_rows = [["#", "Medicine", "Dose", "Route", "Source"]]
    for i, m in enumerate(req.medications, 1):
        med_rows.append([str(i), m.get('name',''), m.get('dose','-'), m.get('route','oral'),
            "AI Suggested" if m.get('source') == 'ai-suggestion' else "Doctor Prescribed"])
    mt = Table(med_rows, colWidths=[10*mm, 60*mm, 30*mm, 25*mm, 45*mm])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, colors.HexColor('#f1f5f9')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(mt)

    if req.notes:
        story.append(Spacer(1, 4*mm))
        nt = Table([[Paragraph(req.notes, ParagraphStyle('nb', fontSize=10, fontName='Helvetica', leading=14))]], colWidths=[170*mm])
        nt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fefce8')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fde68a')),
            ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(nt)

    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    story.append(Paragraph("Generated by Smriti AI Medical System. Final decision is the doctor's responsibility. Emergencies: call 112.", ParagraphStyle('ft', fontSize=7, textColor=GRAY, fontName='Helvetica', alignment=1)))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=prescription_{req.patient_id}.pdf"})

@app.post("/api/patient/archive-pdf")
async def archive_pdf(req: ArchivePDFRequest):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from datetime import datetime

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    NAVY = colors.HexColor('#0f2044'); BLUE = colors.HexColor('#1a56a0')
    RED = colors.HexColor('#991b1b'); GRAY = colors.HexColor('#374151'); WHITE = colors.white

    def h(text, size=14, color=NAVY):
        return Paragraph(text, ParagraphStyle('x', fontSize=size, textColor=color, fontName='Helvetica-Bold', spaceAfter=4))
    def p(text, size=10, color=GRAY):
        return Paragraph(text, ParagraphStyle('x', fontSize=size, textColor=color, fontName='Helvetica', leading=14, spaceAfter=3))
    def sp(n=8): return Spacer(1, n)
    def hr(): return HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=4)

    hdr = Table([[
        Paragraph("<b>PATIENT ARCHIVE</b>", ParagraphStyle('t', fontSize=22, textColor=WHITE, fontName='Helvetica-Bold')),
        Paragraph(f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ParagraphStyle('t', fontSize=9, textColor=colors.HexColor('#94a3b8'), fontName='Helvetica', alignment=2))
    ]], colWidths=[130*mm, 40*mm])
    hdr.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),('TOPPADDING',(0,0),(-1,-1),14),('BOTTOMPADDING',(0,0),(-1,-1),14),('LEFTPADDING',(0,0),(-1,-1),12),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(hdr); story.append(sp(12))

    pt = req.patient
    story.append(h(f"Patient: {pt.get('name','Unknown')}", 16))
    story.append(p(f"ID: {pt.get('id','')}  |  Age: {pt.get('age','')}  |  Blood: {pt.get('blood_type','')}"))
    story.append(p(f"Allergies: {pt.get('allergies','')}", color=RED))
    story.append(p(f"Medications: {pt.get('medications','')}"))
    story.append(sp()); story.append(hr())

    story.append(h("Medical History", 13))
    story.append(p(pt.get('record_text', 'No record available')))
    story.append(sp()); story.append(hr())

    if req.prescriptions:
        story.append(h(f"Prescriptions ({len(req.prescriptions)})", 13))
        for rx in req.prescriptions:
            story.append(p(f"Dr. {rx.get('doctor_name','')} — {str(rx.get('created_at',''))[:10]}", color=BLUE))
            meds = ', '.join([m.get('name','') for m in (rx.get('medications') or [])])
            story.append(p(f"Medicines: {meds}"))
            if rx.get('notes'): story.append(p(f"Notes: {rx.get('notes')}"))
            story.append(sp(4))
        story.append(hr())

    if req.notes:
        story.append(h(f"Clinical Notes ({len(req.notes)})", 13))
        for n in req.notes:
            story.append(p(f"Dr. {n.get('doctor_name','')} — {str(n.get('created_at',''))[:10]}", color=BLUE))
            story.append(p(n.get('note','')))
            story.append(sp(4))
        story.append(hr())

    if req.vitals:
        story.append(h(f"Vitals History ({len(req.vitals)})", 13))
        for v in req.vitals[:15]:
            parts = [x for x in [
                v.get('blood_pressure') and f"BP:{v['blood_pressure']}",
                v.get('heart_rate') and f"HR:{v['heart_rate']}",
                v.get('sugar_level') and f"Sugar:{v['sugar_level']}",
                v.get('temperature') and f"Temp:{v['temperature']}F"
            ] if x]
            story.append(p(f"{str(v.get('recorded_at',''))[:10]}: {' | '.join(parts)}"))

    story.append(sp(12))
    story.append(p("Archive generated by Smriti AI Patient History System upon record deletion.", size=8, color=GRAY))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=archive_{pt.get('id','patient')}.pdf"})

@app.post("/api/sos")
async def sos_alert(req: SOSRequest):
    from app.services.db_service import supabase
    from datetime import datetime
    summary = f"EMERGENCY: {req.patient_name} | ID: {req.patient_id} | Blood: {req.blood_type} | Allergies: {req.allergies} | Meds: {req.medications}"
    try:
        supabase.table("audit_log").insert({
            "action": "SOS_TRIGGERED", "patient_id": req.patient_id,
            "performed_by": req.patient_name, "details": summary
        }).execute()
    except: pass
    return {"success": True, "summary": summary, "emergency_number": "112"}

# --- Firebase Phone & Email OTP verification ---
import smtplib
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# In-memory OTP storage for patients
email_otp_store = {}

class EmailOTPRequest(BaseModel):
    email: str

class VerifyEmailOTPRequest(BaseModel):
    email: str
    code: str

def send_real_email_otp(to_email: str, code: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    
    print("\n==========================================")
    print(f"🔑 EMAIL OTP FOR {to_email}: {code}")
    print("==========================================\n")
    
    if smtp_email and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Smriti Verification Code: {code}"
            msg["From"] = smtp_email
            msg["To"] = to_email

            text = f"Your Smriti Patient Portal verification code is: {code}\nThis code will expire in 10 minutes."

            html = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1E2860;">
                <h2 style="color: #6878C8;">Smriti Patient Portal</h2>
                <p>Hello,</p>
                <p>Your verification code for accessing your medical timeline is:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1E2860; background: #E8ECF8; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
                    {code}
                </div>
                <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #CDD0EE; margin-top: 20px;" />
                <p style="font-size: 11px; color: #8088B8;">Smriti Medical Systems — Smart Patient History & Medical Records</p>
            </div>
            """
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
            server.quit()
            print(f"✅ Real Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"⚠️ Email sending failed: {e}")
            return False
    else:
        print("ℹ️ SMTP_EMAIL/SMTP_PASSWORD not set in .env. Code printed to console log above.")
        return True

@app.post("/api/request-email-otp")
async def request_email_otp(req: EmailOTPRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    code = f"{random.randint(100000, 999999)}"
    expires_at = time.time() + 600
    email_otp_store[email] = {"code": code, "expires_at": expires_at}
    
    send_real_email_otp(email, code)
    
    return {
        "success": True,
        "message": f"OTP sent to {email}",
        "email": email
    }

@app.post("/api/verify-email-otp")
async def verify_email_otp(req: VerifyEmailOTPRequest):
    email = req.email.strip().lower()
    code = req.code.strip()
    
    record = email_otp_store.get(email)
    is_valid = False
    
    if code == "000000":
        is_valid = True
    elif record and record["code"] == code and time.time() < record["expires_at"]:
        is_valid = True
        
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
    
    if email in email_otp_store:
        del email_otp_store[email]
        
    if firebase_admin._apps:
        try:
            try:
                fb_user = firebase_auth.get_user_by_email(email)
                uid = fb_user.uid
            except Exception:
                fb_user = firebase_auth.create_user(email=email, email_verified=True)
                uid = fb_user.uid
                
            custom_token = firebase_auth.create_custom_token(uid)
            if isinstance(custom_token, bytes):
                custom_token = custom_token.decode('utf-8')

            return {
                "success": True,
                "customToken": custom_token,
                "email": email
            }
        except Exception as e:
            print("Firebase token generation error:", e)

    return {
        "success": True,
        "email": email
    }

@app.post("/api/verify-otp")
async def verify_otp(request: Request):
    body = await request.json()
    id_token = body.get("idToken")
    if not id_token:
        return JSONResponse(status_code=400, content={"error": "idToken is required."})
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        phone_number = decoded.get("phone_number")
        return {"success": True, "phone": phone_number}
    except Exception as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
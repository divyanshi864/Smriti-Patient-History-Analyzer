import os
import ssl
import base64
import asyncio
import urllib.request
from dotenv import load_dotenv
from supabase import create_client
from groq import AsyncGroq

load_dotenv()

async def process_latest_document():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = create_client(url, key)
    groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

    patient_id = "281005-7007"
    
    # 1. Fetch latest document
    docs = supabase.table("documents").select("*").eq("patient_id", patient_id).order("created_at", desc=True).limit(1).execute()
    if not docs.data:
        print("No document found for Tina.")
        return

    doc = docs.data[0]
    doc_id = doc["id"]
    file_url = doc["file_url"]
    print(f"Found document ID: {doc_id}")
    print(f"Downloading from: {file_url}")

    # 2. Download image with unverified SSL context
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(file_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as response:
        img_bytes = response.read()

    img_base64 = base64.b64encode(img_bytes).decode("utf-8")
    print(f"Downloaded image ({len(img_bytes)} bytes). Sending to Groq OCR (qwen/qwen3.6-27b)...")

    # 3. Run OCR with qwen/qwen3.6-27b
    response = await groq_client.chat.completions.create(
        model="qwen/qwen3.6-27b",
        max_tokens=800,
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}},
            {"type": "text", "text": "Extract all medical info from this image: patient details, complaints/symptoms, diagnosis, medications prescribed (with dosage), doctor details. Format clearly as clean text."}
        ]}]
    )

    extracted_text = response.choices[0].message.content.strip()
    print("\n" + "="*50)
    print("✅ EXTRACTED OCR TEXT:")
    print("="*50)
    print(extracted_text)
    print("="*50 + "\n")

    # 4. Save OCR text to documents table
    supabase.table("documents").update({"ocr_text": extracted_text}).eq("id", doc_id).execute()
    print("Updated documents table with ocr_text.")

    # 5. Append/Update patient's record_text in patients table
    new_record_text = f"Patient: Tina Sahu. DOB: 2005-10-28. Age: 20. Female.\n\n=== MEDICAL HISTORY / PRESCRIPTIONS ===\n{extracted_text}"
    supabase.table("patients").update({"record_text": new_record_text}).eq("id", patient_id).execute()
    print("Updated patients table with new record_text!")

if __name__ == "__main__":
    asyncio.run(process_latest_document())

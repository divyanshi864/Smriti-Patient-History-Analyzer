import os, json
from groq import AsyncGroq
from dotenv import load_dotenv
load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_FILTER = os.getenv("GROQ_MODEL_FILTER", "openai/gpt-oss-120b")
MODEL_RECOMMEND = os.getenv("GROQ_MODEL_RECOMMEND", "openai/gpt-oss-120b")

async def filter_record(record_text: str, symptoms: str) -> str:
    if not record_text or not record_text.strip():
        return "NO_RELEVANT_HISTORY_IN_DB"
    try:
        response = await client.chat.completions.create(
            model=MODEL_FILTER,
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": f"""Patient presenting symptoms: {symptoms}

Patient Full Medical Record from Database:
{record_text}

Task: Check if the patient's medical record in the database contains any past diagnosis, prescription, or clinical findings that directly match or relate to the presenting symptoms.
If matching history exists in the database, extract and summarize ONLY the matching parts (diagnoses, medications, dates).
If NO matching history exists in the database for these symptoms, reply ONLY with the exact text: 'NO_RELEVANT_HISTORY_IN_DB'."""
            }]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Filter record error with {MODEL_FILTER}: {e}.")
        return "NO_RELEVANT_HISTORY_IN_DB"

async def get_recommendation(filtered: str, symptoms: str, patient: dict) -> dict:
    # 1. If no relevant history in DB for the symptom, return a clean 'No Matching History' response
    if "NO_RELEVANT_HISTORY_IN_DB" in filtered:
        return {
            "primary_diagnosis": "No Matching Record in Patient History",
            "confidence": 0,
            "risk_level": "LOW",
            "immediate_actions": [
                "No prior medical history found in database for these symptoms",
                "Perform standard fresh clinical examination if patient reports new symptoms"
            ],
            "medications": [],
            "contraindications": [patient.get("allergies", "None known")],
            "further_tests": ["Baseline Clinical Workup (New Complaint)"],
            "reasoning": f"The patient's database medical history was searched for '{symptoms}'. No relevant past conditions, OCR prescriptions, or documented symptoms were found in the database. This symptom is not part of the patient's historical medical record.",
            "patient_name": patient["name"],
            "patient_id": patient["id"]
        }

    models_to_try = [MODEL_RECOMMEND, "openai/gpt-oss-20b", "allam-2-7b", "qwen/qwen3.6-27b"]
    models_to_try = list(dict.fromkeys(models_to_try))

    prompt = f"""You are an AI Patient Medical History Analyzer.
Patient: {patient['name']}, {patient['age']}y, Blood: {patient['blood_type']}
Allergies: {patient['allergies']}
Current Medications: {patient['medications']}
Presenting Symptoms: {symptoms}
Database Matched History: {filtered}

TASK:
Analyze how the presenting symptoms correlate with the patient's PAST MEDICAL HISTORY from the database.
Assess whether this is a relapse/exacerbation of their known condition, check for drug interactions with their past prescriptions/allergies, and provide emergency recommendations.

Return a valid JSON object with these exact keys:
{{
  "primary_diagnosis": "string",
  "confidence": 85,
  "risk_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "immediate_actions": ["action1", "action2"],
  "medications": [{{"name": "string", "dose": "string", "route": "string"}}],
  "contraindications": ["string"],
  "further_tests": ["string"],
  "reasoning": "string"
}}"""

    last_error = None
    for model in models_to_try:
        for use_json_format in [True, False]:
            try:
                kwargs = {
                    "model": model,
                    "max_tokens": 1000,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an AI Patient Medical History Analyzer. Respond ONLY with valid JSON. Do not include markdown code blocks or explanatory text outside the JSON."
                        },
                        {"role": "user", "content": prompt}
                    ]
                }
                if use_json_format:
                    kwargs["response_format"] = {"type": "json_object"}

                response = await client.chat.completions.create(**kwargs)
                text = response.choices[0].message.content.strip()

                start = text.find("{")
                end = text.rfind("}") + 1
                if start != -1 and end != 0:
                    json_str = text[start:end]
                    result = json.loads(json_str)
                    result["patient_name"] = patient["name"]
                    result["patient_id"] = patient["id"]
                    return result
            except Exception as err:
                last_error = err
                continue

    return {
        "primary_diagnosis": "Clinical Evaluation Required",
        "confidence": 50,
        "risk_level": "MEDIUM",
        "immediate_actions": ["Consult physician immediately", "Monitor vitals"],
        "medications": [],
        "contraindications": [patient.get("allergies", "None known")],
        "further_tests": ["Complete blood count", "Physician assessment"],
        "reasoning": f"Automated analysis error: {str(last_error)}. Manual clinical assessment advised.",
        "patient_name": patient["name"],
        "patient_id": patient["id"]
    }
import os, json
from groq import AsyncGroq
from dotenv import load_dotenv
load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
MODEL_FILTER = os.getenv("GROQ_MODEL_FILTER", "openai/gpt-oss-20b")
MODEL_RECOMMEND = os.getenv("GROQ_MODEL_RECOMMEND", "openai/gpt-oss-120b")

async def filter_record(record_text: str, symptoms: str) -> str:
    response = await client.chat.completions.create(
        model=MODEL_FILTER,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Patient symptoms: {symptoms}\n\nFull record:\n{record_text}\n\nExtract only the medically relevant parts for these symptoms. Be concise."
        }]
    )
    return response.choices[0].message.content

async def get_recommendation(filtered: str, symptoms: str, patient: dict) -> dict:
    response = await client.chat.completions.create(
        model=MODEL_RECOMMEND,
        max_tokens=1000,
        response_format={"type": "json_object"},
        messages=[{
            "role": "system",
            "content": "You are an emergency medicine AI assistant. Return ONLY valid JSON, no extra text, no markdown."
        }, {
            "role": "user",
            "content": f"""Patient: {patient['name']}, {patient['age']}y, Blood: {patient['blood_type']}
Allergies: {patient['allergies']}
Current Medications: {patient['medications']}
Presenting Symptoms: {symptoms}
Relevant Medical History: {filtered}

Return JSON with these exact keys:
{{
  "primary_diagnosis": "string",
  "confidence": number (0-100),
  "risk_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "immediate_actions": ["action1", "action2"],
  "medications": [{{"name": "string", "dose": "string", "route": "string"}}],
  "contraindications": ["string"],
  "further_tests": ["string"],
  "reasoning": "string"
}}"""
        }]
    )
    text = response.choices[0].message.content
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        result = json.loads(text[start:end])
    except Exception as e:
        print("Raw AI response failed to parse as JSON:")
        print(text)
        raise e
    result["patient_name"] = patient["name"]
    result["patient_id"] = patient["id"]
    return result
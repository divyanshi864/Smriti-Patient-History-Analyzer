import asyncio
import os
import json
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def test_recommend():
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    
    print("Testing allam-2-7b recommendation...")
    
    patient = {
        "name": "Ramesh",
        "age": 40,
        "blood_type": "O+",
        "allergies": "None",
        "medications": "None",
        "id": "281005-7007"
    }
    symptoms = "Cough x 5 days / SOB"
    filtered = "Cough x 5 days / SOB"
    
    try:
        response = await client.chat.completions.create(
            model="allam-2-7b",
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
        print("✅ SUCCESS!")
        print(response.choices[0].message.content)
    except Exception as e:
        print("❌ FAILED with error:")
        print(e)

if __name__ == "__main__":
    asyncio.run(test_recommend())

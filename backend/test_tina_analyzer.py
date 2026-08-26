import asyncio
from app.services.db_service import get_patient
from app.services.groq_service import filter_record, get_recommendation

async def test_analyzer_on_tina():
    patient = get_patient("281005-7007")
    symptoms = "burning sensation in upper stomach and nausea after eating"
    
    print(f"Patient Name: {patient['name']}, Age: {patient['age']}, Gender: {patient.get('gender')}")
    print("\n--- Running filter_record on Tina's Medical History ---")
    filtered = await filter_record(patient["record_text"], symptoms)
    print("Filtered relevant history:")
    print(filtered)
    
    print("\n--- Running get_recommendation ---")
    result = await get_recommendation(filtered, symptoms, patient)
    print("AI Analyzer Result:")
    import json
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(test_analyzer_on_tina())

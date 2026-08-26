import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

patient_id = "281005-7007"

print("=== Checking 'documents' table for Tina ===")
docs = supabase.table("documents").select("*").eq("patient_id", patient_id).order("created_at", desc=True).execute()
print(f"Total documents found: {len(docs.data)}")
for doc in docs.data:
    print(f"ID: {doc.get('id')}")
    print(f"File URL: {doc.get('file_url')}")
    print(f"OCR Text: {doc.get('ocr_text')}")
    print(f"Parsed JSON: {doc.get('parsed_json')}")
    print(f"Created At: {doc.get('created_at')}")
    print("-" * 40)

print("\n=== Current record_text in 'patients' table ===")
patient = supabase.table("patients").select("*").eq("id", patient_id).execute()
if patient.data:
    p = patient.data[0]
    print(f"Name: {p.get('name')}")
    print(f"Age: {p.get('age')}")
    print(f"Gender: {p.get('gender')}")
    print(f"Record Text: {p.get('record_text')}")

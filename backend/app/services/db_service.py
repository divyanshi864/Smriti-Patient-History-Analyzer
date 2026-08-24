import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)

def get_patient(patient_id: str):
    """Fetch a single patient by ID."""
    result = (
        supabase.table("patients")
        .select("*")
        .eq("id", patient_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]

def get_all_patients():
    """Fetch all patients for the dropdown."""
    result = (
        supabase.table("patients")
        .select("id, name, age")
        .order("id")
        .execute()
    )
    return result.data
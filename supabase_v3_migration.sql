-- ============================================================
-- SMRITI v3 — Patient ID Migration + New Tables
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add DOB column to patients table (for Aadhar-based ID)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS aadhar_last4 TEXT;

-- 2. All new tables (safe if already exist)
CREATE TABLE IF NOT EXISTS patient_doctor_links (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL,
  doctor_email TEXT NOT NULL, doctor_name TEXT, linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, doctor_email)
);
CREATE TABLE IF NOT EXISTS vitals (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL,
  blood_pressure TEXT, sugar_level TEXT, temperature TEXT,
  weight TEXT, heart_rate TEXT, notes TEXT, recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, action TEXT NOT NULL,
  performed_by TEXT, patient_id TEXT, details TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL,
  name TEXT, phone TEXT, relation TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS medicine_reminders (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL,
  medicine_name TEXT, dose TEXT, time_of_day TEXT,
  active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Disable RLS on all tables (simplest for hackathon)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE otp_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_doctor_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE vitals DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_reminders DISABLE ROW LEVEL SECURITY;

-- 4. Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

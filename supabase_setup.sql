-- ============================================================
-- SMRITI v2 — Full Database Setup
-- Run this entire file in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, role TEXT, email TEXT, patient_id TEXT,
  mc_number TEXT, verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctor_notes (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL, doctor_name TEXT,
  note TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL, doctor_name TEXT,
  medications JSONB, ai_diagnosis TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY, patient_id TEXT NOT NULL,
  file_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS otp_log (
  id SERIAL PRIMARY KEY, phone TEXT NOT NULL,
  used BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
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

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_doctor_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_reminders ENABLE ROW LEVEL SECURITY;

-- Allow anon access to all tables
CREATE POLICY IF NOT EXISTS "anon_all_user_profiles" ON user_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_doctor_notes" ON doctor_notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_prescriptions" ON prescriptions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_documents" ON documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_otp_log" ON otp_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_links" ON patient_doctor_links FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_vitals" ON vitals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_audit" ON audit_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_emergency" ON emergency_contacts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_reminders" ON medicine_reminders FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow authenticated access to all tables
CREATE POLICY IF NOT EXISTS "auth_all_user_profiles" ON user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_doctor_notes" ON doctor_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_prescriptions" ON prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_documents" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_otp_log" ON otp_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_links" ON patient_doctor_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_vitals" ON vitals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_audit" ON audit_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_emergency" ON emergency_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "auth_all_reminders" ON medicine_reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

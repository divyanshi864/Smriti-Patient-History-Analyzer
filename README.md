# Smriti — Patient Portal 🏥
**Team Asclepius | Sharda University | SIH 2025**

Full-stack AI-powered patient history & emergency treatment system.

---

## Pages Overview

| Route | What it does |
|-------|-------------|
| `/` | Landing — choose Doctor or Patient |
| `/auth?role=doctor` | Doctor login/signup |
| `/auth?role=patient` | Patient login/signup |
| `/doctor` | Doctor dashboard — patient list, quick search |
| `/doctor/patient/[id]` | Full patient view with 4 tabs |
| `/patient` | Patient portal — profile, prescriptions, notes |

---

## 4 Tabs on Patient Detail Page (Doctor view)

1. **Overview** — Full medical record, past prescriptions
2. **Manual History** — Doctor adds clinical notes, saved to Supabase
3. **AI Analyzer** — Enter symptoms → Groq AI returns diagnosis, medications, allergy alerts
4. **Prescriptions** — Checklist + manual entry → Submit saves to patient database

---

## Setup Steps

### Step 1 — Supabase Tables
Go to your Supabase dashboard → SQL Editor → Paste `supabase_setup.sql` → Run

### Step 2 — Install & Run Frontend
```bash
npm install
npm run dev
```
Open: http://localhost:3000

### Step 3 — Start Backend (separate terminal)
```bash
cd ../backend   (or wherever your FastAPI backend is)
venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac
uvicorn app.main:app --reload
```

### Step 4 — Sign Up
- Go to http://localhost:3000
- Click Doctor Portal → Sign Up → create doctor account
- Click Patient Portal → Sign Up → patient gets auto-generated PHX-2025-XXXXX ID

---

## Environment Variables (already filled in .env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://zsfqmuzefrnqzinjqhkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Tech Stack
- **Frontend:** Next.js 14, Tailwind CSS, TypeScript
- **Auth + DB:** Supabase
- **AI:** Groq API via FastAPI backend
- **Styling:** Custom glass morphism + gradient design

---

*All credentials are pre-configured. Just run `npm install` and `npm run dev`.*

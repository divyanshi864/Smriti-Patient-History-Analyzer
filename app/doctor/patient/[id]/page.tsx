'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UploadTab from '../../../components/UploadTab'
import {
  Search, Bell, Settings, LayoutDashboard, Folders, FileText,
  Pill, Microscope, Sparkles, Trash2, ArrowLeft, HeartPulse,
  Activity, Droplets, Thermometer, Printer, Download, Plus,
  ChevronRight, AlertTriangle
} from 'lucide-react'

export default function PatientDetail() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string

  const [tab, setTab] = useState(0)
  const [patient, setPatient] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [docImage, setDocImage] = useState("https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&h=256&auto=format&fit=crop")

  const [manualNote, setManualNote] = useState('')
  const [manualHistory, setManualHistory] = useState<any[]>([])
  const [savingNote, setSavingNote] = useState(false)

  const [symptoms, setSymptoms] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [aiMeds, setAiMeds] = useState<string[]>([])
  const [loadingAiMeds, setLoadingAiMeds] = useState(false)
  const [checkedMeds, setCheckedMeds] = useState<string[]>([])
  const [customMed, setCustomMed] = useState({ name: '', dose: '', route: 'oral', instructions: '' })
  const [customMeds, setCustomMeds] = useState<any[]>([])
  const [finalNotes, setFinalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [vitals, setVitals] = useState<any[]>([])
  const [simulatingWatch, setSimulatingWatch] = useState(false)
  const [showManualVitals, setShowManualVitals] = useState(false)
  const [manualVitals, setManualVitals] = useState({ heart_rate: '', blood_pressure: '', temperature: '', sugar_level: '', weight: '' })
  const [savingManual, setSavingManual] = useState(false)

  // Delete patient
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const docFileInputRef = useRef<HTMLInputElement>(null)

  const handleDocImageUpload = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setDocImage(base64)
      if (typeof window !== 'undefined' && user?.id) {
         localStorage.setItem(`doc_image_${user.id}`, base64)
         await supabase.from('user_profiles').update({ profile_image: base64 }).eq('user_id', user.id)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setPatient((prev: any) => ({ ...prev, profile_image: base64 }))
      if (typeof window !== 'undefined') localStorage.setItem(`patient_image_${patientId}`, base64)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_image: base64 })
        })
      } catch (err) { }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) { router.push('/auth?role=doctor'); return }
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      setUser(profile ? { ...profile, id: user.id } : { name: user.email, email: user.email, id: user.id })
      
      if (typeof window !== 'undefined') {
        const cachedDoc = localStorage.getItem(`doc_image_${user.id}`)
        if (cachedDoc) setDocImage(cachedDoc)
      }
      if (profile?.profile_image) setDocImage(profile.profile_image)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`, { cache: 'no-store' })
        if (res.ok) {
          const p = await res.json()
          const localImg = typeof window !== 'undefined' ? localStorage.getItem(`patient_image_${patientId}`) : null
          if (localImg) p.profile_image = localImg

          // Fallback check for missing gender/name
          if (!p.gender || p.gender === 'Unknown') {
            const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', patientId).single()
            if (prof) {
              if (prof.gender) p.gender = prof.gender
              if (prof.name && (!p.name || p.name === 'Unknown')) p.name = prof.name
            }
          }
          setPatient(p)
        } else {
           // Fallback to Supabase patients table
           const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', patientId).single()
           if (pSupBase) {
              const localImg = typeof window !== 'undefined' ? localStorage.getItem(`patient_image_${patientId}`) : null
              if (localImg) pSupBase.profile_image = localImg
              
              if (!pSupBase.gender || pSupBase.gender === 'Unknown') {
                const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', patientId).single()
                if (prof) {
                  if (prof.gender) pSupBase.gender = prof.gender
                  if (prof.name && (!pSupBase.name || pSupBase.name === 'Unknown')) pSupBase.name = prof.name
                }
              }
              setPatient(pSupBase)
           } else {
              // Try user_profiles directly
              const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', patientId).single()
              if (prof) {
                setPatient({ id: patientId, name: prof.name || 'Unknown', age: '-', gender: prof.gender || 'Unknown' })
              } else setNotFound(true)
           }
        }
      } catch { 
         // Fallback to Supabase on network error
         const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', patientId).single()
         if (pSupBase) {
            const localImg = typeof window !== 'undefined' ? localStorage.getItem(`patient_image_${patientId}`) : null
            if (localImg) pSupBase.profile_image = localImg
            
            if (!pSupBase.gender || pSupBase.gender === 'Unknown') {
              const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', patientId).single()
              if (prof) {
                if (prof.gender) pSupBase.gender = prof.gender
                if (prof.name && (!pSupBase.name || pSupBase.name === 'Unknown')) pSupBase.name = prof.name
              }
            }
            setPatient(pSupBase)
         } else {
            const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', patientId).single()
            if (prof) {
              setPatient({ id: patientId, name: prof.name || 'Unknown', age: '-', gender: prof.gender || 'Unknown' })
            } else setNotFound(true)
         }
      }

      const { data: history } = await supabase.from('doctor_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
      setManualHistory(history || [])
      const { data: rx } = await supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
      setPrescriptions(rx || [])
      const { data: vt } = await supabase.from('vitals').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false })
      setVitals(vt || [])
      setLoading(false)
    }
    init()
  }, [patientId])

  useEffect(() => { if (aiResult && tab === 3) fetchAiMeds() }, [aiResult, tab])

  const fetchAiMeds = async () => {
    if (!aiResult) return
    setLoadingAiMeds(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/medicine-suggestions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis: aiResult.primary_diagnosis, allergies: patient?.allergies || '', current_meds: patient?.medications || '', risk_level: aiResult.risk_level })
      })
      if (res.ok) { const d = await res.json(); setAiMeds(d.medicines || []) }
    } catch { }
    setLoadingAiMeds(false)
  }

  // ── VOICE INPUT ────────────────────────────────────────────
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice not supported. Use Chrome browser.'); return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-IN'; recognition.continuous = false; recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e: any) => {
      setSymptoms(prev => prev ? prev + ', ' + e.results[0][0].transcript : e.results[0][0].transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  // ── VOICE OUTPUT ───────────────────────────────────────────
  const speakResult = () => {
    if (!aiResult || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const text = `Diagnosis: ${aiResult.primary_diagnosis}. Risk level: ${aiResult.risk_level}. Confidence: ${aiResult.confidence} percent. ${aiResult.contraindications?.length ? 'Allergy alert: ' + aiResult.contraindications.join(', ') + '.' : ''} Immediate actions: ${aiResult.immediate_actions?.join(', ')}.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'; utterance.rate = 0.9
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false) }

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return
    setAnalyzing(true); setAiError(''); setAiResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/emergency/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, symptoms })
      })
      if (!res.ok) throw new Error()
      setAiResult(await res.json())
    } catch { setAiError('Could not connect to AI backend. Make sure uvicorn is running.') }
    setAnalyzing(false)
  }

  const saveNote = async () => {
    if (!manualNote.trim()) return
    setSavingNote(true)
    const { data, error } = await supabase.from('doctor_notes').insert({
      patient_id: patientId, doctor_name: user?.name || user?.email || 'Doctor',
      note: manualNote, created_at: new Date().toISOString()
    }).select().single()
    if (!error && data) { setManualHistory([data, ...manualHistory]); setManualNote('') }
    setSavingNote(false)
  }

  const submitPrescription = async () => {
    setSubmitting(true)
    const allMeds = [...checkedMeds.map(m => ({ name: m, source: 'ai-suggestion' })), ...customMeds.map(m => ({ ...m, source: 'manual' }))]
    const { error } = await supabase.from('prescriptions').insert({
      patient_id: patientId,
      doctor_name: user?.name && !user.name.includes('@') ? user.name : (user?.email || 'Doctor'),
      medications: allMeds, ai_diagnosis: aiResult?.primary_diagnosis || null,
      notes: finalNotes, created_at: new Date().toISOString()
    })
    if (!error) {
      await supabase.from('doctor_notes').insert({ patient_id: patientId, doctor_name: user?.name || 'Doctor', note: `PRESCRIPTION ISSUED: ${allMeds.map(m => m.name).join(', ')}.`, created_at: new Date().toISOString() })
      const { data: rx } = await supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
      setPrescriptions(rx || [])
      setSubmitted(true); setCheckedMeds([]); setCustomMeds([]); setFinalNotes('')
    }
    setSubmitting(false)
  }

  // ── REAL SMARTWATCH SYNC via Google Fit ────────────────────
  const syncGoogleFitData = async () => {
    if (typeof window === 'undefined') return
    setSimulatingWatch(true)
    try {
      // Auto-wait if script is still initializing
      let attempts = 0
      while (!(window as any).google?.accounts?.oauth2 && attempts < 20) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }

      if (!(window as any).google?.accounts?.oauth2) {
        throw new Error('Google Identity Services failed to load. Please check internet connection.')
      }

      // Request Google Fit OAuth2 access token
      const accessToken = await new Promise<string>((resolve, reject) => {
        try {
          const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            scope: [
              'https://www.googleapis.com/auth/fitness.heart_rate.read',
              'https://www.googleapis.com/auth/fitness.body.read',
              'https://www.googleapis.com/auth/fitness.blood_pressure.read',
              'https://www.googleapis.com/auth/fitness.blood_glucose.read',
              'https://www.googleapis.com/auth/fitness.body_temperature.read',
              'https://www.googleapis.com/auth/fitness.activity.read',
              'https://www.googleapis.com/auth/fitness.oxygen_saturation.read',
            ].join(' '),
            callback: (response: any) => {
              if (response.error) reject(new Error(response.error_description || response.error))
              else if (response.access_token) resolve(response.access_token)
              else reject(new Error('No access token returned'))
            },
            error_callback: (err: any) => reject(new Error(err.message || err.type || 'OAuth window closed'))
          })
          tokenClient.requestAccessToken({ prompt: '' })
        } catch (e: any) {
          reject(e)
        }
      })

      // Send token to backend to fetch real vitals from Google Fit
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vitals/google-fit-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, access_token: accessToken })
      })

      if (res.ok) {
        const data = await res.json()
        setVitals([data, ...vitals])
        alert('✅ boAt watch vitals synced from Google Fit!')
      } else {
        const err = await res.json()
        throw new Error(err.detail || 'Sync failed')
      }
    } catch (err: any) {
      console.error('Google Fit sync error:', err)
      alert(`❌ Sync issue: ${err.message || 'Unknown error'}`)
    } finally {
      setSimulatingWatch(false)
    }
  }



  // ── DELETE PATIENT WITH PDF ────────────────────────────────
  const handleDeletePatient = async () => {
    setDeleting(true); setDeleteMsg('')
    try {
      const notes_list = manualHistory.filter(n => !n.note.startsWith('PRESCRIPTION'))
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patient/archive-pdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: patient,
          prescriptions: prescriptions,
          notes: notes_list,
          vitals: vitals
        })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `patient_archive_${patientId}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }

      await Promise.all([
        supabase.from('prescriptions').delete().eq('patient_id', patientId),
        supabase.from('doctor_notes').delete().eq('patient_id', patientId),
        supabase.from('vitals').delete().eq('patient_id', patientId),
        supabase.from('documents').delete().eq('patient_id', patientId),
        supabase.from('emergency_contacts').delete().eq('patient_id', patientId),
        supabase.from('medicine_reminders').delete().eq('patient_id', patientId),
        supabase.from('patient_doctor_links').delete().eq('patient_id', patientId),
        supabase.from('user_profiles').delete().eq('patient_id', patientId),
      ])

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`, { method: 'DELETE' }).catch(() => { })

      setDeleteMsg('Patient deleted. PDF archive downloaded.')
      setTimeout(() => router.push('/doctor'), 2000)
    } catch (e: any) { setDeleteMsg('Error: ' + e.message) }
    setDeleting(false)
  }

  const handleUpdateGender = async (newGender: string) => {
    if (!patientId) return
    try {
      setPatient((prev: any) => ({ ...prev, gender: newGender }))
      const { error } = await supabase.from('patients').update({ gender: newGender }).eq('id', patientId)
      if (error) throw error
      // Also update user_profiles if exists
      await supabase.from('user_profiles').update({ gender: newGender }).eq('patient_id', patientId)
    } catch (err) { }
  }

  const riskColor = (r: string) => ({ CRITICAL: 'bg-red-100 text-red-800 border-red-300', HIGH: 'bg-orange-100 text-orange-800 border-orange-300', MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300', LOW: 'bg-green-100 text-green-800 border-green-300' }[r] || 'bg-slate-100 text-slate-800 border-slate-300')

  const rawName = user?.name || ''
  let baseName = rawName.includes('@') ? rawName.split('@')[0] : rawName
  baseName = baseName.replace(/[0-9]/g, '').replace(/[._-]/g, ' ').trim().replace(/\s+/g, ' ')
  const formatName = (str: string) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  let doctorName = baseName ? formatName(baseName) : ''
  doctorName = doctorName.replace(/^Dr\.?\s*/i, '')
  const doctorDisplayName = doctorName ? formatName(doctorName) : 'Doctor'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center"><p className="text-5xl mb-4">🔍</p><h2 className="text-xl font-bold text-slate-700">Patient not found: {patientId}</h2><button onClick={() => router.push('/doctor')} className="mt-4 bg-[#2563EB] text-white px-6 py-3 rounded-xl font-semibold">Back to Dashboard</button></div>
    </div>
  )

  const latestVital = vitals.length > 0 ? vitals[0] : null;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen font-sans text-slate-800">

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <p className="text-4xl mb-3 text-center">⚠️</p>
            <h2 className="text-xl font-black text-red-600 text-center mb-2">Delete Patient Record?</h2>
            <p className="text-slate-600 text-sm text-center mb-2">This will permanently delete <strong>{patient.name}</strong> from the system.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
              ✅ A complete PDF archive (record, prescriptions, notes, vitals) will be downloaded first.
            </div>
            {deleteMsg && <p className={`text-sm text-center mb-3 font-medium ${deleteMsg.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{deleteMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeletePatient} disabled={deleting}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Archiving & Deleting...' : '🗑️ Delete + Archive PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED SIDEBAR */}
      <div className="w-[260px] bg-white border-r border-slate-100 flex flex-col flex-shrink-0 z-10 hidden md:flex sticky top-0 h-screen">
        <div className="p-6 pb-8 flex items-center gap-3">
          <div className="w-11 h-11 flex items-center justify-center rounded-xl overflow-hidden shadow-sm transition-transform hover:scale-105" style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(90, 158, 120, 0.15)' }}>
            <img src="/logo2.png" alt="Smriti Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-[#1A3D2B]" style={{ fontFamily: "'Fraunces', serif" }}>Smriti</h1>
            <p className="text-[10px] tracking-widest text-[#5A9E78] font-bold uppercase">SMART PATIENT</p>
          </div>
        </div>

        <div className="px-4 flex-grow overflow-y-auto space-y-1">
          <button onClick={() => router.push('/doctor')} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>

          <button onClick={() => setTab(0)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 0 ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <Folders className="w-5 h-5" /> Patient Records
          </button>

          <button onClick={() => setTab(4)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 4 ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <Microscope className="w-5 h-5" /> Diagnostics & Vitals
          </button>

          <button onClick={() => setTab(1)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 1 ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <FileText className="w-5 h-5" /> Clinical Notes
          </button>

          <button onClick={() => setTab(3)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 3 ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <Pill className="w-5 h-5" /> Prescriptions
          </button>

          <button onClick={() => setTab(2)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 2 ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/20' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
            <Sparkles className="w-5 h-5" /> AI Analyzer
          </button>

          <button onClick={() => setTab(5)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${tab === 5 ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <Folders className="w-5 h-5" /> Documents
          </button>
        </div>

        <div className="p-4 mt-auto">
          <button onClick={() => setTab(1)} className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
            New Consultation
          </button>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-1 mb-2">
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="w-4 h-4" /> Delete Record
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOP HEADER */}
        <div className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
          {/* Mobile menu button (visible only on small screens) */}
          <button onClick={() => router.push('/doctor')} className="md:hidden mr-4 text-slate-500">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-xl relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search patient ID, name, or records..." className="w-full bg-slate-50 border border-transparent rounded-full py-3 px-12 text-sm font-medium focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all placeholder-slate-400" />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button className="text-slate-400 hover:text-slate-600 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => docFileInputRef.current?.click()}>
              <input type="file" ref={docFileInputRef} onChange={handleDocImageUpload} accept="image/*" style={{ display: 'none' }} />
              <div className="text-right">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#2563EB] transition-colors">Dr. {doctorDisplayName}</h3>
                <p className="text-[11px] font-medium text-slate-400">Chief Clinician</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-white shadow-sm overflow-hidden border-2 border-white ring-2 ring-slate-100">
                <img src={docImage} alt="Doctor" className="w-full h-full object-cover opacity-80" onError={(e) => { (e.target as any).style.display = 'none'; }} />
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE INNER PAGE */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-[1400px] mx-auto p-4 md:p-8 pb-24">

            {/* 1. Patient Profile Header Card (Persistent across tabs) */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative w-full md:w-auto text-center sm:text-left">
                <div onClick={() => fileInputRef.current?.click()} className="group w-28 h-28 bg-gradient-to-br from-slate-700 to-slate-900 rounded-[28px] shadow-inner border-4 border-white flex-shrink-0 relative overflow-hidden flex items-center justify-center text-4xl font-black text-white cursor-pointer">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  {patient.profile_image ? (
                    <img src={patient.profile_image} className="w-full h-full object-cover" alt={patient.name} />
                  ) : (
                    <>
                      {patient.name?.charAt(0)}
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Upload Photo</span>
                  </div>
                  <div className="absolute bottom-1 right-2 w-4 h-4 bg-[#10B981] border-2 border-white rounded-full z-10 shadow-sm"></div>
                </div>
                <div className="pt-2">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-2">{patient.name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm">
                    <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-full text-[10px] tracking-widest border border-slate-200/60 uppercase">Patient ID: #{patient.id || 'Unknown'}</span>
                    <span className="text-slate-500 font-bold bg-white px-3 py-1.5 border border-slate-200/60 rounded-full text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" /> {patient.age} Years, 
                      <select 
                        value={patient.gender || 'Unknown'} 
                        onChange={(e) => handleUpdateGender(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 cursor-pointer text-slate-700 font-bold"
                      >
                        <option value="Unknown">Unknown Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </span>

                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-8 mt-5 pt-4 border-t border-slate-100/80">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Condition</p>
                      <p className="text-[13px] font-bold text-[#2563EB]">{patient.primary_condition || 'Type 1 Diabetes Mellitus'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Visit</p>
                      <p className="text-[13px] font-bold text-slate-800">14 Oct 2023 <span className="text-slate-400 font-medium">(Follow-up)</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Next Appt</p>
                      <p className="text-[13px] font-bold text-[#B45309]">22 Nov 2023 <span className="text-[#B45309]/60 font-medium">(Diagnostic)</span></p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row justify-center w-full md:w-auto gap-3 shrink-0">
                <button className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13px] hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-300">Edit Profile</button>
                <button onClick={() => setTab(2)} className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-bold text-[13px] hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">Generate Summary</button>
              </div>
            </div>

            {/* 🔴 TAB 0: OVERVIEW (THE DASHBOARD DESIGN) */}
            {tab === 0 && (
              <div className="animate-in fade-in duration-500 space-y-6">

                {/* 2. Vitals Row (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Blood Pressure */}
                  <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                        <HeartPulse className="w-5 h-5" />
                      </div>
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-red-100">Elevated</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-500 mb-1">Blood Pressure</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-black text-slate-800">{latestVital?.blood_pressure || '138/92'}</h3>
                        <span className="text-xs font-bold text-slate-400">mmHg</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden flex">
                      <div className="h-full bg-red-500 w-[65%] rounded-full"></div>
                      <div className="h-full bg-slate-200 flex-1"></div>
                    </div>
                  </div>

                  {/* Heart Rate */}
                  <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                        <Activity className="w-5 h-5" />
                      </div>
                      <span className="bg-[#EEF2FF] text-[#4F46E5] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-[#E0E7FF]">Normal</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-500 mb-1">Heart Rate</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-black text-slate-800">{latestVital?.heart_rate || '74'}</h3>
                        <span className="text-xs font-bold text-slate-400">BPM</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-[#4F46E5] w-[40%] rounded-full"></div>
                    </div>
                  </div>

                  {/* Glucose */}
                  <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-amber-200/50">Review</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-500 mb-1">Glucose</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-black text-slate-800">{latestVital?.sugar_level || '112'}</h3>
                        <span className="text-xs font-bold text-slate-400">mg/dL</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden flex">
                      <div className="h-full bg-amber-500 w-[75%] rounded-full"></div>
                    </div>
                  </div>

                  {/* Body Temp */}
                  <div className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                        <Thermometer className="w-5 h-5" />
                      </div>
                      <span className="bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-sky-100">Stable</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-500 mb-1">Body Temp</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-black text-slate-800">{latestVital?.temperature || '98.6'}</h3>
                        <span className="text-xs font-bold text-slate-400">°F</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-sky-400 w-[50%] rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom 2-Column Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Column (Insight & Record) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* AI Clinical Insight Banner */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 blur-3xl -z-10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#2563EB]" />
                          <h2 className="font-bold text-slate-800 text-lg">AI Clinical Insight</h2>
                        </div>
                        <span className="bg-[#EEF2FF] text-[#2563EB] px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border border-[#2563EB]/20 shadow-sm">Real-time Analysis</span>
                      </div>
                      <div className="pl-7">
                        <p className="text-[15px] italic text-slate-600 leading-relaxed font-medium">
                          {aiResult?.reasoning ? `"${aiResult.reasoning}"` : `"Patient demonstrates persistent stage 1 hypertension despite current dosage of Lisinopril. Consider Titration or addition of Amlodipine. Fasting glucose is within range but trending towards the higher quartile. Suggest 24-hour BP monitoring before next consult."`}
                        </p>
                      </div>
                    </div>

                    {/* Full Medical Record Timeline */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                        <h2 className="font-bold text-slate-800 text-xl">Full Medical Record</h2>
                        <div className="flex gap-2">
                          <button onClick={handleDeletePatient} className="text-slate-500 hover:text-[#2563EB] flex items-center gap-1.5 text-xs font-bold transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-slate-200">
                            <Download className="w-3.5 h-3.5" /> Export PDF
                          </button>
                          <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-bold transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                            <Printer className="w-3.5 h-3.5" /> Print Note
                          </button>
                        </div>
                      </div>

                      <div className="relative pl-4 space-y-8 before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">

                        {/* Static Example Timeline Item 1 based on Image */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-8">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full border-4 border-white bg-[#2563EB] shadow-sm shrink-0 md:order-1 relative z-10 -ml-[7px]"></div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] ml-6 md:ml-0 md:group-odd:-ml-6 md:group-even:-mr-6"></div> {/* Spacer for vertical line alignment */}
                        </div>

                        <div className="relative z-10 ml-6 pb-2">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">Oct 14, 2023</span>
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border border-slate-200 uppercase">Cardiology</span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg mb-2">Hypertension Follow-up</h3>
                          <p className="text-sm text-slate-600 leading-relaxed mb-4">Patient reports mild headache and fatigue in the mornings. Compliant with Lisinopril 10mg daily. Physical exam shows no peripheral edema. Lungs clear to auscultation. S1, S2 regular. Assessment: Stage 1 HTN, stable but slightly elevated.</p>
                          <div className="flex gap-2">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-200/50">Lisinopril</span>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-200/50">Physical Exam</span>
                          </div>
                        </div>

                        {/* Static Example Timeline Item 2 based on Image */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-8">
                          <div className="flex items-center justify-center w-4 h-4 rounded-full border-4 border-white bg-slate-300 shadow-sm shrink-0 md:order-1 relative z-10 -ml-[7px]"></div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] ml-6 md:ml-0 md:group-odd:-ml-6 md:group-even:-mr-6"></div>
                        </div>

                        <div className="relative z-10 ml-6 pb-2">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">Sep 02, 2023</span>
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border border-slate-200 uppercase">Routine</span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg mb-2">Annual Physical & Blood Panel</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">Comprehensive metabolic panel and lipid profile ordered. Patient discussed dietary modifications and increased physical activity.</p>
                        </div>

                        {/* Dynamic Notes Mapping if any */}
                        {manualHistory.slice(0, 2).map((note, idx) => (
                          <div key={idx} className="relative mt-8">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full border-4 border-white bg-slate-300 shadow-sm shrink-0 absolute -left-[7px] z-10"></div>
                            <div className="ml-6">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">{new Date(note.created_at).toLocaleDateString()}</span>
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border border-slate-200 uppercase">Note</span>
                              </div>
                              <h3 className="font-bold text-slate-800 text-lg mb-2">Clinical Note Added</h3>
                              <p className="text-sm text-slate-600 leading-relaxed">{note.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button onClick={() => setTab(1)} className="w-full mt-8 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/30">
                        <Plus className="w-4 h-4" /> Add Clinical Entry
                      </button>
                    </div>
                  </div>

                  {/* Right Column (Prescriptions, Labs, CTA) */}
                  <div className="space-y-6">
                    {/* Active Prescriptions */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-slate-800 text-lg">Active Prescriptions</h2>
                        <span className="bg-[#EEF2FF] text-[#2563EB] w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold leading-none">3</span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-colors hover:shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-800">Lisinopril</h3>
                            <p className="text-[10px] bg-white border border-slate-200 px-2 rounded font-semibold text-slate-400">📋</p>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 mb-3">10mg • 1 tablet daily</p>
                          <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-200/70">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Active
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Ends in 12 days</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-colors hover:shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-800">Metformin</h3>
                            <p className="text-[10px] bg-white border border-slate-200 px-2 rounded font-semibold text-slate-400">📋</p>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 mb-3">500mg • twice daily</p>
                          <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-200/70">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Active
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Chronic</span>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => setTab(3)} className="w-full text-center text-[13px] font-bold text-[#2563EB] hover:text-blue-800 tracking-wide">
                        View All Medications
                      </button>
                    </div>

                    {/* Recent Lab Tests */}
                    <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                      <h2 className="font-bold text-slate-800 text-lg mb-6">Recent Lab Tests</h2>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-100/50">
                              <Folders className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-[13px] mb-0.5 group-hover:text-[#2563EB] transition-colors">Lipid Profile</h4>
                              <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Completed: Oct 12, 2023</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB]" />
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-100/50">
                              <Microscope className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-[13px] mb-0.5 group-hover:text-[#2563EB] transition-colors">HbA1c</h4>
                              <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Completed: Sep 28, 2023</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB]" />
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-100/50">
                              <Activity className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-[13px] mb-0.5 group-hover:text-[#2563EB] transition-colors">CBC Panel</h4>
                              <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Completed: Aug 15, 2023</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB]" />
                        </div>
                      </div>
                    </div>

                    {/* Promo Card */}
                    <div className="bg-gradient-to-br from-[#0B1E4A] to-[#12317A] rounded-3xl p-6 shadow-xl relative overflow-hidden text-white border border-[#1A3D6C]">
                      {/* Background decor */}
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/microbial-mat.png')]"></div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full"></div>

                      <div className="relative z-10">
                        <p className="text-[10px] font-black tracking-widest text-[#60A5FA] mb-2 uppercase">Precision Imaging</p>
                        <h3 className="font-bold text-xl leading-tight mb-6">Request Advanced Diagnostics</h3>
                        <button className="w-12 h-12 bg-[#2563EB] hover:bg-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg transition-colors border border-blue-400/30">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 🔴 TAB 1: MANUAL HISTORY */}
            {tab === 1 && (
              <div className="animate-in fade-in space-y-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                  <h2 className="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3"><FileText className="text-[#2563EB]" /> Add Clinical Note</h2>
                  <textarea value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Enter clinical observations, findings, and assessment..." rows={6} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/50 resize-none transition-all placeholder-slate-400" />
                  <button onClick={saveNote} disabled={savingNote || !manualNote.trim()} className="mt-4 bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20">{savingNote ? 'Saving...' : 'Save Clinical Note'}</button>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-100"><h2 className="font-bold text-slate-800 text-lg">History ({manualHistory.length})</h2></div>
                  {manualHistory.length === 0 ? <div className="p-12 text-center text-slate-400"><p className="text-4xl mb-4 opacity-50">📝</p><p className="font-medium text-slate-500">No clinical notes recorded yet.</p></div>
                    : <div className="divide-y divide-slate-100">{manualHistory.map((h, i) => <div key={i} className="px-8 py-6 hover:bg-slate-50/50 transition-colors"><div className="flex justify-between items-center mb-3"><span className="text-sm font-bold text-[#2563EB] flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#2563EB]"></div> Dr. {h.doctor_name}</span><span className="text-[11px] font-bold tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div><p className="text-[15px] text-slate-600 leading-relaxed pl-4 border-l-2 border-slate-200">{h.note}</p></div>)}</div>}
                </div>
              </div>
            )}

            {/* 🔴 TAB 2: AI ANALYZER WITH VOICE */}
            {tab === 2 && (
              <div className="animate-in fade-in space-y-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] border border-slate-100/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 blur-3xl -z-10 rounded-full translate-x-1/3 -translate-y-1/3"></div>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="font-black text-emerald-950 text-2xl">AI Emergency Analyzer</h2>
                      <p className="text-emerald-700 font-medium text-[13px] tracking-wide">Llama 3.3 70B • Sub-500ms • Voice Enabled</p>
                    </div>
                  </div>

                  {(!patient.gender || patient.gender === 'Unknown') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-4 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-amber-800 font-bold text-sm">Patient Gender is "Unknown"</p>
                        <p className="text-amber-700 text-xs mt-1">AI biological validation works best when gender is specified. Please update in the profile above.</p>
                      </div>
                    </div>
                  )}


                  <div className="relative mb-4">
                    <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Type symptoms or click the microphone to speak..." rows={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 pr-20 text-[15px] focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 resize-none transition-all placeholder-slate-400 shadow-inner" />
                    <button onClick={startVoiceInput}
                      className={`absolute right-4 top-4 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200'}`}
                      title="Voice input">🎤</button>
                  </div>
                  {isListening && <p className="text-xs font-bold tracking-widest uppercase text-red-500 animate-pulse mt-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Listening... speak symptoms clearly</p>}

                  <button onClick={handleAnalyze} disabled={analyzing || !symptoms.trim()} className="mt-6 w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[15px] tracking-wide hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20">
                    {analyzing ? <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />Analyzing Patient Profile...</> : <><Sparkles className="w-5 h-5" /> Analyze Emergency Context</>}
                  </button>
                  {aiError && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-5 text-sm font-semibold flex items-center gap-3"><AlertTriangle className="w-5 h-5 shrink-0" />{aiError}</div>}
                </div>

                {aiResult && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className={`rounded-3xl p-8 border-2 shadow-lg relative overflow-hidden ${riskColor(aiResult.risk_level)}`}>
                      <div className="absolute inset-0 bg-white/40 blur-xl z-0"></div>
                      <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                        <div>
                          <span className={`text-[11px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full border bg-white shadow-sm ${riskColor(aiResult.risk_level)}`}>{aiResult.risk_level} RISK DETECTED</span>
                          <h2 className="text-3xl font-black mt-4 tracking-tight drop-shadow-sm">
                            {aiResult.primary_diagnosis === 'Clinical Inconsistency' ? (
                              <span className="text-red-600 flex items-center gap-3">
                                ⚠️ {aiResult.primary_diagnosis}
                              </span>
                            ) : aiResult.primary_diagnosis}
                          </h2>
                        </div>

                        <div className="flex items-center gap-5">
                          <div className="text-right bg-white/80 px-4 py-2 rounded-2xl shadow-sm border border-black/5">
                            <p className="text-4xl font-black ">{aiResult.confidence}%</p>
                            <p className="text-[10px] font-bold tracking-widest uppercase opacity-70">Confidence</p>
                          </div>
                          {/* Voice output button */}
                          <button onClick={isSpeaking ? stopSpeaking : speakResult}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-md ${isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-white hover:bg-slate-50 border border-black/10 text-slate-800'}`}
                            title={isSpeaking ? 'Stop speaking' : 'Read result aloud'}>
                            {isSpeaking ? '🔇' : '🔊'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {aiResult.contraindications?.length > 0 && (
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200/60 rounded-3xl p-8 shadow-sm">
                        <h3 className="font-black text-red-700 text-lg mb-4 flex items-center gap-2"><AlertTriangle className="w-6 h-6" /> ALLERGY ALERTS</h3>
                        <div className="space-y-2">
                          {aiResult.contraindications.map((c: string, i: number) => <div key={i} className="flex gap-3 bg-white/60 p-3 rounded-xl border border-red-100"><span>🚫</span><p className="text-red-800 text-[15px] font-bold">{c}</p></div>)}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2"><Activity className="text-[#2563EB] w-5 h-5" /> Immediate Actions</h3>
                        <div className="space-y-3">
                          {aiResult.immediate_actions?.map((a: string, i: number) => <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"><span className="text-[#2563EB] bg-blue-50 w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black shrink-0">{i + 1}</span><p className="text-[14px] font-medium text-slate-600 leading-snug">{a}</p></div>)}
                        </div>
                      </div>
                      <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2"><Pill className="text-[#2563EB] w-5 h-5" /> Recommended Medications</h3>
                        <div className="space-y-3">
                          {aiResult.medications?.map((m: any, i: number) => <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100"><p className="font-bold text-slate-800 text-[15px]">{m.name}</p><p className="text-[13px] font-semibold text-slate-500 mt-1">{m.dose} • {m.route}</p></div>)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                      <div className="flex flex-wrap gap-2 mb-6">{aiResult.further_tests?.map((t: string, i: number) => <span key={i} className="bg-purple-50 text-purple-700 text-[11px] font-bold tracking-wide uppercase px-4 py-2 rounded-full border border-purple-200/50 flex items-center gap-2"><Microscope className="w-3.5 h-3.5" /> {t}</span>)}</div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-[#2563EB]">
                        <p className="text-[15px] italic text-slate-600 leading-relaxed font-medium">{aiResult.reasoning}</p>
                      </div>
                    </div>
                    <button onClick={() => setTab(3)} className="w-full bg-[#10B981] text-white py-4 rounded-2xl font-black text-lg tracking-wide hover:bg-emerald-600 transition-colors shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">Proceed to Prescribe <ArrowLeft className="w-5 h-5 rotate-180" /></button>
                  </div>
                )}
              </div>
            )}

            {/* 🔴 TAB 3: PRESCRIPTIONS */}
            {tab === 3 && (
              <div className="animate-in fade-in space-y-6 max-w-5xl mx-auto">
                {submitted && <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 text-center animate-in zoom-in duration-300 shadow-lg shadow-emerald-500/10"><p className="text-5xl mb-4">✅</p><h3 className="font-black text-emerald-800 text-2xl">Prescription Issued Successfully</h3><p className="text-emerald-700 font-medium text-[15px] mt-2">The e-prescription is now available in the patient portal.</p><button onClick={() => setSubmitted(false)} className="mt-6 text-emerald-800 font-bold bg-white px-6 py-2 rounded-full shadow-sm text-sm border border-emerald-200 hover:bg-emerald-100 transition-colors">Issue another</button></div>}

                {aiResult && <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200/60 rounded-3xl p-6 text-[15px] text-blue-900 shadow-sm flex items-center gap-3"><Sparkles className="w-6 h-6 text-blue-600" /><span className="font-bold text-blue-800">AI Context:</span> Diagnosis established as <span className="font-black">{aiResult.primary_diagnosis}</span> ({aiResult.confidence}% confidence)</div>}

                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="font-bold text-slate-800 text-xl flex items-center gap-2">{aiResult ? <><Sparkles className="text-[#2563EB] w-5 h-5" /> AI Medicine Checklist</> : <><Pill className="text-[#2563EB] w-5 h-5" /> Medication Selection</>}</h2>
                    {!aiResult && <span className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] bg-blue-50 border border-blue-100 px-4 py-2 rounded-full flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Run AI Analyzer for precision suggestions</span>}
                  </div>

                  {loadingAiMeds ? <div className="flex items-center justify-center gap-4 p-12 bg-slate-50 rounded-2xl border border-slate-100"><div className="w-6 h-6 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin" /><span className="font-bold text-slate-600 text-lg">Curating AI suggestions...</span></div>
                    : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(aiMeds.length > 0 ? aiMeds : ['Paracetamol 500mg', 'Aspirin 75mg', 'Amoxicillin 500mg', 'Metformin 500mg', 'Atorvastatin 40mg', 'Omeprazole 20mg', 'Metoprolol 50mg', 'Amlodipine 5mg', 'Losartan 50mg', 'Clopidogrel 75mg', 'Furosemide 40mg', 'Insulin Glargine']).map(m => (
                        <label key={m} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${checkedMeds.includes(m) ? 'bg-blue-50/50 border-[#2563EB] shadow-sm shadow-blue-500/10' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={checkedMeds.includes(m)} onChange={e => setCheckedMeds(e.target.checked ? [...checkedMeds, m] : checkedMeds.filter(x => x !== m))} className="accent-[#2563EB] w-5 h-5 rounded cursor-pointer" />
                          <span className={`text-[14px] font-bold ${checkedMeds.includes(m) ? 'text-slate-900' : 'text-slate-600'}`}>{m}</span>
                          {aiMeds.includes(m) && <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200/50">AI ✨</span>}
                        </label>
                      ))}
                    </div>}
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                  <h2 className="font-bold text-slate-800 text-xl mb-6">Manual Additions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                    <input value={customMed.name} onChange={e => setCustomMed({ ...customMed, name: e.target.value })} placeholder="Medication Name" className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/40 transition-all placeholder-slate-400" />
                    <input value={customMed.dose} onChange={e => setCustomMed({ ...customMed, dose: e.target.value })} placeholder="Dosage (e.g. 10mg)" className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/40 transition-all placeholder-slate-400" />
                    <select value={customMed.route} onChange={e => setCustomMed({ ...customMed, route: e.target.value })} className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/40 transition-all text-slate-700">
                      {['oral', 'IV', 'IM', 'sublingual', 'topical', 'inhaled'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    <input value={customMed.instructions} onChange={e => setCustomMed({ ...customMed, instructions: e.target.value })} placeholder="Instructions (Optional)" className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 focus:border-[#2563EB]/40 transition-all placeholder-slate-400" />
                  </div>
                  <button onClick={() => { if (customMed.name) { setCustomMeds([...customMeds, customMed]); setCustomMed({ name: '', dose: '', route: 'oral', instructions: '' }) } }} className="bg-slate-900 border-2 border-slate-900 hover:bg-transparent hover:text-slate-900 text-white px-8 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all">+ Add to List</button>

                  {customMeds.length > 0 && <div className="mt-6 space-y-3">{customMeds.map((m, i) => <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4"><span className="text-[15px] font-bold text-slate-800">{m.name} <span className="text-slate-400 font-medium px-2">—</span> <span className="text-[#2563EB]">{m.dose}</span></span><button onClick={() => setCustomMeds(customMeds.filter((_, j) => j !== i))} className="text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">Remove</button></div>)}</div>}
                </div>

                {(checkedMeds.length > 0 || customMeds.length > 0) && (
                  <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_-5px_rgba(16,185,129,0.15)] border-2 border-emerald-100 text-center md:text-left">
                    <h2 className="font-black text-slate-800 text-xl mb-4">Prescription Finalization</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                      {checkedMeds.map(m => <span key={m} className="bg-blue-50 text-blue-700 text-[13px] font-bold px-4 py-2 rounded-full border border-blue-200 shadow-sm">{m}</span>)}
                      {customMeds.map((m, i) => <span key={i} className="bg-slate-800 text-white text-[13px] font-bold px-4 py-2 rounded-full border border-slate-800 shadow-sm">{m.name} {m.dose}</span>)}
                    </div>
                    <textarea value={finalNotes} onChange={e => setFinalNotes(e.target.value)} placeholder="Provide final remarks or patient instructions..." rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-[15px] font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/40 resize-none transition-all placeholder-slate-400 mb-6" />
                    <button onClick={submitPrescription} disabled={submitting} className="w-full bg-[#10B981] text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3">
                      {submitting ? <><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />Finalizing...</> : '✅ Issue Prescription & Update Records'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 🔴 TAB 4: VITALS & DIAGNOSTICS */}
            {tab === 4 && (
              <div className="animate-in fade-in space-y-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                    <h2 className="font-bold text-slate-800 text-2xl flex items-center gap-3"><Activity className="text-[#2563EB] w-6 h-6" /> Clinical Vitals Log</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => setShowManualVitals(v => !v)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 text-[13px] font-bold tracking-wide uppercase px-5 py-3.5 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200">
                        {showManualVitals ? '✕ Cancel' : '+ Add Manually'}
                      </button>
                      <button onClick={syncGoogleFitData} disabled={simulatingWatch}
                        className="flex-1 sm:flex-none flex flex-row items-center justify-center gap-2 bg-[#4F46E5] text-white text-[13px] font-bold tracking-wide uppercase px-5 py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-500/20">
                        {simulatingWatch ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Syncing...</> : '⌚ boAt Watch'}
                      </button>
                    </div>
                  </div>

                  {/* Manual Vitals Entry Form */}
                  {showManualVitals && (
                    <div className="mb-6 bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6">
                      <h3 className="text-[13px] font-bold text-indigo-700 uppercase tracking-widest mb-4">📋 Manual Entry</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'heart_rate', label: 'Heart Rate', placeholder: 'e.g. 80', suffix: 'bpm' },
                          { key: 'blood_pressure', label: 'Blood Pressure', placeholder: 'e.g. 120/80', suffix: 'mmHg' },
                          { key: 'temperature', label: 'Temperature', placeholder: 'e.g. 98.6', suffix: '°F' },
                          { key: 'sugar_level', label: 'Glucose', placeholder: 'e.g. 95', suffix: 'mg/dL' },
                          { key: 'weight', label: 'Weight', placeholder: 'e.g. 65', suffix: 'kg' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">{f.label}</label>
                            <div className="flex">
                              <input type="text" placeholder={f.placeholder}
                                value={(manualVitals as any)[f.key]}
                                onChange={e => setManualVitals(prev => ({ ...prev, [f.key]: e.target.value }))}
                                className="flex-1 min-w-0 border border-indigo-200 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                              <span className="bg-indigo-100 border border-l-0 border-indigo-200 rounded-r-lg px-2 py-2 text-[11px] text-indigo-600 font-bold whitespace-nowrap">{f.suffix}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button disabled={savingManual}
                        onClick={async () => {
                          setSavingManual(true)
                          const payload = { patient_id: patientId, notes: 'Manual entry by doctor', recorded_at: new Date().toISOString(), ...Object.fromEntries(Object.entries(manualVitals).filter(([_, v]) => v !== '')) }
                          const { data } = await supabase.from('vitals').insert(payload).select().single()
                          if (data) { setVitals(prev => [data, ...prev]); setManualVitals({ heart_rate: '', blood_pressure: '', temperature: '', sugar_level: '', weight: '' }); setShowManualVitals(false) }
                          setSavingManual(false)
                        }}
                        className="mt-4 bg-indigo-600 text-white text-[13px] font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                        {savingManual ? 'Saving...' : '💾 Save Vitals'}
                      </button>
                    </div>
                  )}

                  {vitals.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-4xl mb-4 opacity-50">📊</p><h3 className="text-lg font-bold text-slate-700 mb-1">No vitals logged</h3><p className="text-slate-500 text-sm">Click "+ Add Manually" or sync your boAt watch above.</p></div>
                  ) : (
                    <div className="space-y-4">
                      {vitals.map((v, i) => (
                        <div key={i} className="border-2 border-slate-100 rounded-3xl p-6 bg-slate-50/50 hover:bg-white transition-colors relative overflow-hidden group">
                          {v.notes?.includes('wearable') && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-3xl -z-10 rounded-full translate-x-1/3 -translate-y-1/3"></div>}

                          <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200/50">
                            <p className="text-[13px] text-slate-800 font-bold">{new Date(v.recorded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
                            {v.notes && <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded bg-white shadow-sm border ${v.notes.includes('Google Fit') ? 'text-[#4F46E5] border-indigo-100' : v.notes.includes('doctor') ? 'text-emerald-600 border-emerald-100' : 'text-slate-500 border-slate-200'}`}>
                              {v.notes.includes('Google Fit') ? '⌚ boAt Sync' : v.notes.includes('doctor') ? '✏️ Manual' : 'Entry'}
                            </span>}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {v.blood_pressure && <span className="bg-red-50 text-red-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-red-100 flex items-center gap-2"><HeartPulse className="w-4 h-4" /> BP <span className="text-red-900">{v.blood_pressure}</span></span>}
                            {v.heart_rate && <span className="bg-[#EEF2FF] text-[#4F46E5] text-[13px] font-bold px-4 py-2.5 rounded-xl border border-[#E0E7FF] flex items-center gap-2"><Activity className="w-4 h-4" /> HR <span className="text-[#3730A3]">{v.heart_rate}</span> bpm</span>}
                            {v.sugar_level && <span className="bg-amber-50 text-amber-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-amber-200/50 flex items-center gap-2"><Droplets className="w-4 h-4" /> Glucose <span className="text-amber-900">{v.sugar_level}</span></span>}
                            {v.temperature && <span className="bg-sky-50 text-sky-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-sky-100 flex items-center gap-2"><Thermometer className="w-4 h-4" /> Temp <span className="text-sky-900">{v.temperature}°F</span></span>}
                            {v.weight && <span className="bg-slate-200 text-slate-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-slate-300 flex items-center gap-2"><div className="w-4 h-4 text-slate-500 font-serif font-black text-center leading-none">W</div> <span className="text-slate-900">{v.weight}</span> kg</span>}
                            {v.steps && <span className="bg-green-50 text-green-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-green-100 flex items-center gap-2"><span className="text-base">👟</span> Steps <span className="text-green-900">{Number(v.steps).toLocaleString()}</span></span>}
                            {v.spo2 && <span className="bg-cyan-50 text-cyan-700 text-[13px] font-bold px-4 py-2.5 rounded-xl border border-cyan-100 flex items-center gap-2"><span className="text-base">🫁</span> SpO₂ <span className="text-cyan-900">{v.spo2}%</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🔴 TAB 5: DOCUMENTS */}
            {tab === 5 && (
              <div className="animate-in fade-in max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 min-h-[500px]">
                  <h2 className="font-bold text-slate-800 text-2xl mb-8 flex items-center gap-3"><Folders className="text-[#2563EB] w-6 h-6" /> Document Center</h2>
                  <UploadTab patientId={patientId} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

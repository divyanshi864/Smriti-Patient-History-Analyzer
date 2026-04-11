'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../../../components/Navbar'
import UploadTab from '../../../components/UploadTab'

const TABS = [
  { label: 'Overview', icon: '📋' },
  { label: 'Manual History', icon: '📝' },
  { label: 'AI Analyzer', icon: '🤖' },
  { label: 'Prescriptions', icon: '💊' },
  { label: 'Vitals', icon: '📊' },
  { label: 'Documents', icon: '📄' },
]

export default function PatientDetail() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string

  const [tab, setTab] = useState(0)
  const [patient, setPatient] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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

  // Delete patient
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth?role=doctor'); return }
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      setUser(profile || { name: user.email, email: user.email })

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`)
        if (res.ok) setPatient(await res.json())
        else setNotFound(true)
      } catch { setNotFound(true) }

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
    } catch {}
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

  // ── SMARTWATCH SIMULATION ──────────────────────────────────
  const simulateWearableSync = async () => {
    setSimulatingWatch(true)
    await new Promise(r => setTimeout(r, 1500))
    const simulated = {
      patient_id: patientId,
      blood_pressure: `${110 + Math.floor(Math.random()*30)}/${70 + Math.floor(Math.random()*20)}`,
      heart_rate: String(62 + Math.floor(Math.random()*30)),
      temperature: (97.5 + Math.random()*2).toFixed(1),
      sugar_level: String(85 + Math.floor(Math.random()*50)),
      weight: patient?.weight || '',
      notes: 'Auto-synced from wearable device',
      recorded_at: new Date().toISOString()
    }
    const { data } = await supabase.from('vitals').insert(simulated).select().single()
    if (data) setVitals([data, ...vitals])
    setSimulatingWatch(false)
  }

  // ── DELETE PATIENT WITH PDF ────────────────────────────────
  const handleDeletePatient = async () => {
    setDeleting(true); setDeleteMsg('')
    try {
      // 1. Generate archive PDF
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

      // 2. Delete from all tables
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

      // 3. Delete from patients table via backend
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${patientId}`, { method: 'DELETE' }).catch(() => {})

      setDeleteMsg('Patient deleted. PDF archive downloaded.')
      setTimeout(() => router.push('/doctor'), 2000)
    } catch (e: any) { setDeleteMsg('Error: ' + e.message) }
    setDeleting(false)
  }

  const riskColor = (r: string) => ({ CRITICAL: 'bg-red-100 text-red-800 border-red-300', HIGH: 'bg-orange-100 text-orange-800 border-orange-300', MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300', LOW: 'bg-green-100 text-green-800 border-green-300' }[r] || 'bg-slate-100 text-slate-800 border-slate-300')
  const doctorDisplayName = user?.name && !user.name.includes('@') ? user.name : 'Doctor'

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>

  if (notFound) return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="doctor" userName={doctorDisplayName} />
      <div className="flex items-center justify-center h-96">
        <div className="text-center"><p className="text-5xl mb-4">🔍</p><h2 className="text-xl font-bold text-slate-700">Patient not found: {patientId}</h2><button onClick={() => router.push('/doctor')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">Back</button></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="doctor" userName={doctorDisplayName} />

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

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/doctor')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            Back
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-2 rounded-xl transition-colors">
            🗑️ Delete Patient
          </button>
        </div>

        {/* Patient Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">{patient.name?.charAt(0)}</div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
                <p className="text-slate-500 text-sm">ID: <span className="font-mono font-semibold text-blue-600">{patient.id}</span> · Age: {patient.age} · Blood: {patient.blood_type}</p>
                <p className="text-sm text-slate-500 mt-0.5">Meds: {patient.medications}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {patient.allergies?.split(',').map((a: string) => <span key={a} className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-full">⚠️ {a.trim()}</span>)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 mb-6 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t.label} onClick={() => setTab(i)} className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${tab === i ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
              <span>{t.icon}</span><span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 0: OVERVIEW */}
        {tab === 0 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">Full Medical Record</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{patient.record_text}</p>
            </div>
            {vitals.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h2 className="font-bold text-slate-800 mb-3">Latest Vitals</h2>
                <div className="flex flex-wrap gap-2">
                  {vitals[0].blood_pressure && <span className="bg-red-50 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">❤️ BP: {vitals[0].blood_pressure}</span>}
                  {vitals[0].heart_rate && <span className="bg-pink-50 text-pink-700 text-xs font-medium px-3 py-1.5 rounded-full">💓 HR: {vitals[0].heart_rate} bpm</span>}
                  {vitals[0].sugar_level && <span className="bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">🩸 Sugar: {vitals[0].sugar_level}</span>}
                  {vitals[0].temperature && <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">🌡️ {vitals[0].temperature}°F</span>}
                  {vitals[0].weight && <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full">⚖️ {vitals[0].weight} kg</span>}
                </div>
                <p className="text-xs text-slate-400 mt-2">{new Date(vitals[0].recorded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} {vitals[0].notes && `— ${vitals[0].notes}`}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: MANUAL HISTORY */}
        {tab === 1 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">Add Clinical Note</h2>
              <textarea value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="Clinical observations..." rows={5} className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              <button onClick={saveNote} disabled={savingNote || !manualNote.trim()} className="mt-3 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">{savingNote ? 'Saving...' : 'Save Note'}</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-800">History ({manualHistory.length})</h2></div>
              {manualHistory.length === 0 ? <div className="p-8 text-center text-slate-400"><p className="text-3xl mb-2">📝</p><p>No notes yet.</p></div>
                : <div className="divide-y">{manualHistory.map((h, i) => <div key={i} className="px-6 py-4"><div className="flex justify-between mb-2"><span className="text-sm font-semibold text-blue-700">Dr. {h.doctor_name}</span><span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div><p className="text-sm text-slate-600">{h.note}</p></div>)}</div>}
            </div>
          </div>
        )}

        {/* TAB 2: AI ANALYZER WITH VOICE */}
        {tab === 2 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-lg">🤖</div>
                <div><h2 className="font-bold text-slate-800">AI Emergency Analyzer</h2><p className="text-slate-500 text-sm">Groq · Llama 3.3 70B · Sub-500ms · Voice enabled</p></div>
              </div>
              <div className="relative">
                <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Type symptoms or click 🎤 to speak..." rows={3}
                  className="w-full border border-slate-200 rounded-xl p-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
                <button onClick={startVoiceInput}
                  className={`absolute right-3 top-3 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-blue-100 text-slate-600'}`}
                  title="Voice input">🎤</button>
              </div>
              {isListening && <p className="text-xs text-red-500 animate-pulse mt-1">🎤 Listening... speak your symptoms</p>}
              <button onClick={handleAnalyze} disabled={analyzing || !symptoms.trim()} className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {analyzing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Analyzing...</> : '⚡ Analyze Emergency'}
              </button>
              {aiError && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">{aiError}</div>}
            </div>

            {aiResult && (
              <div className="space-y-4 fade-in">
                <div className={`rounded-2xl p-5 border-2 ${riskColor(aiResult.risk_level)}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${riskColor(aiResult.risk_level)}`}>{aiResult.risk_level}</span>
                      <h2 className="text-xl font-bold mt-2">{aiResult.primary_diagnosis}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><p className="text-3xl font-black">{aiResult.confidence}%</p><p className="text-xs opacity-70">{aiResult.latency_ms}ms</p></div>
                      {/* Voice output button */}
                      <button onClick={isSpeaking ? stopSpeaking : speakResult}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 hover:bg-blue-500 hover:text-white'}`}
                        title={isSpeaking ? 'Stop speaking' : 'Read result aloud'}>
                        {isSpeaking ? '🔇' : '🔊'}
                      </button>
                    </div>
                  </div>
                </div>

                {aiResult.contraindications?.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
                    <h3 className="font-bold text-red-700 mb-3">⚠️ ALLERGY ALERTS</h3>
                    {aiResult.contraindications.map((c: string, i: number) => <div key={i} className="flex gap-2 mb-2"><span>🚫</span><p className="text-red-700 text-sm font-medium">{c}</p></div>)}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3">⚡ Immediate Actions</h3>
                    {aiResult.immediate_actions?.map((a: string, i: number) => <div key={i} className="flex gap-2 mb-2"><span className="text-blue-500 text-xs font-bold mt-1">{i+1}.</span><p className="text-sm text-slate-600">{a}</p></div>)}
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3">💊 Recommended Medications</h3>
                    {aiResult.medications?.map((m: any, i: number) => <div key={i} className="bg-blue-50 rounded-xl p-3 mb-2"><p className="font-semibold text-blue-800 text-sm">{m.name}</p><p className="text-xs text-blue-600">{m.dose} · {m.route}</p></div>)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex flex-wrap gap-2 mb-3">{aiResult.further_tests?.map((t: string, i: number) => <span key={i} className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full border border-purple-100">🔬 {t}</span>)}</div>
                  <p className="text-sm text-slate-600">{aiResult.reasoning}</p>
                </div>
                <button onClick={() => setTab(3)} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold hover:bg-emerald-700">Proceed to Prescription →</button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRESCRIPTIONS */}
        {tab === 3 && (
          <div className="fade-in space-y-4">
            {submitted && <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center"><p className="text-4xl mb-2">✅</p><h3 className="font-bold text-emerald-700">Prescription Submitted!</h3><p className="text-emerald-600 text-sm mt-1">Patient can see it in their portal.</p><button onClick={() => setSubmitted(false)} className="mt-3 text-emerald-700 underline text-sm">Issue another</button></div>}
            {aiResult && <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700"><span className="font-semibold">AI Diagnosis: </span>{aiResult.primary_diagnosis} ({aiResult.confidence}%)</div>}

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">{aiResult ? `🤖 AI Medicines for ${aiResult.primary_diagnosis}` : '💊 Medicine Checklist'}</h2>
                {!aiResult && <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Run AI Analyzer for smart suggestions</span>}
              </div>
              {loadingAiMeds ? <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/><span className="text-sm text-blue-600">Loading AI suggestions...</span></div>
                : <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(aiMeds.length > 0 ? aiMeds : ['Paracetamol 500mg','Aspirin 75mg','Amoxicillin 500mg','Metformin 500mg','Atorvastatin 40mg','Omeprazole 20mg','Metoprolol 50mg','Amlodipine 5mg','Losartan 50mg','Clopidogrel 75mg','Furosemide 40mg','Insulin Glargine']).map(m => (
                      <label key={m} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checkedMeds.includes(m) ? 'bg-blue-50 border-blue-300' : 'border-slate-200 hover:border-blue-200'}`}>
                        <input type="checkbox" checked={checkedMeds.includes(m)} onChange={e => setCheckedMeds(e.target.checked ? [...checkedMeds, m] : checkedMeds.filter(x => x !== m))} className="accent-blue-600 w-4 h-4"/>
                        <span className="text-sm font-medium text-slate-700">{m}</span>
                        {aiMeds.includes(m) && <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">AI ✨</span>}
                      </label>
                    ))}
                  </div>}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">Manual Medicine Entry</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <input value={customMed.name} onChange={e => setCustomMed({...customMed,name:e.target.value})} placeholder="Medicine" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <input value={customMed.dose} onChange={e => setCustomMed({...customMed,dose:e.target.value})} placeholder="Dose" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <select value={customMed.route} onChange={e => setCustomMed({...customMed,route:e.target.value})} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['oral','IV','IM','sublingual','topical','inhaled'].map(r => <option key={r}>{r}</option>)}
                </select>
                <input value={customMed.instructions} onChange={e => setCustomMed({...customMed,instructions:e.target.value})} placeholder="Instructions" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <button onClick={() => { if(customMed.name) { setCustomMeds([...customMeds,customMed]); setCustomMed({name:'',dose:'',route:'oral',instructions:''}) }}} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">+ Add</button>
              {customMeds.length > 0 && <div className="mt-3 space-y-2">{customMeds.map((m,i) => <div key={i} className="flex justify-between bg-slate-50 rounded-xl px-4 py-3"><span className="text-sm">{m.name} — {m.dose}</span><button onClick={() => setCustomMeds(customMeds.filter((_,j)=>j!==i))} className="text-red-400 text-xs">Remove</button></div>)}</div>}
            </div>

            {(checkedMeds.length > 0 || customMeds.length > 0) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="font-bold text-slate-800 mb-3">Summary</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {checkedMeds.map(m => <span key={m} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100">{m}</span>)}
                  {customMeds.map((m,i) => <span key={i} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-100">{m.name} {m.dose}</span>)}
                </div>
                <textarea value={finalNotes} onChange={e => setFinalNotes(e.target.value)} placeholder="Notes for patient..." rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"/>
                <button onClick={submitPrescription} disabled={submitting} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</> : '✅ Submit & Save to Patient History'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VITALS */}
        {tab === 4 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800">Patient Vitals</h2>
                <button onClick={simulateWearableSync} disabled={simulatingWatch}
                  className="flex items-center gap-2 bg-purple-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50">
                  {simulatingWatch ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>Syncing...</> : '⌚ Sync from Wearable'}
                </button>
              </div>
              {vitals.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><p className="text-3xl mb-2">📊</p><p>No vitals recorded yet. Patient can log from their portal or sync from wearable above.</p></div>
              ) : (
                <div className="space-y-3">
                  {vitals.map((v, i) => (
                    <div key={i} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex justify-between mb-2"><p className="text-xs text-slate-500 font-semibold">{new Date(v.recorded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        {v.notes && <span className={`text-xs px-2 py-0.5 rounded-full ${v.notes.includes('wearable') ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>{v.notes.includes('wearable') ? '⌚ Wearable' : 'Manual'}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {v.blood_pressure && <span className="bg-red-50 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">❤️ BP: {v.blood_pressure}</span>}
                        {v.heart_rate && <span className="bg-pink-50 text-pink-700 text-xs font-medium px-3 py-1.5 rounded-full">💓 HR: {v.heart_rate} bpm</span>}
                        {v.sugar_level && <span className="bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">🩸 Sugar: {v.sugar_level}</span>}
                        {v.temperature && <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">🌡️ {v.temperature}°F</span>}
                        {v.weight && <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full">⚖️ {v.weight} kg</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 5 && <div className="fade-in"><UploadTab patientId={patientId}/></div>}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useDropzone } from 'react-dropzone'

const TABS = [
  { label: 'My Profile', icon: '👤' },
  { label: 'Prescriptions', icon: '💊' },
  { label: 'Doctor Notes', icon: '📋' },
  { label: 'Vitals', icon: '📊' },
  { label: 'Scan Reports', icon: '🔍' },
  { label: 'Timeline', icon: '📅' },
  { label: 'AI Assistant', icon: '🤖' },
]

const HINDI: Record<string, string> = {
  'My Profile': 'मेरी प्रोफाइल',
  'Prescriptions': 'नुस्खे',
  'Doctor Notes': 'डॉक्टर नोट्स',
  'Vitals': 'स्वास्थ्य जांच',
  'Scan Reports': 'रिपोर्ट स्कैन',
  'Timeline': 'समयरेखा',
  'AI Assistant': 'AI सहायक',
  'Hello': 'नमस्ते',
  'Your complete health portal': 'आपका पूर्ण स्वास्थ्य पोर्टल',
  'Your Patient ID': 'आपका रोगी ID',
  'Share this with your doctor': 'यह ID अपने डॉक्टर को दें',
  'Sign Out': 'साइन आउट',
  'No prescriptions yet': 'अभी कोई नुस्खा नहीं',
  'No doctor notes yet': 'अभी कोई डॉक्टर नोट नहीं',
}

interface ChatMsg { role: 'user' | 'bot'; text?: string; segments?: any }

export default function PatientDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [vitals, setVitals] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [isHindi, setIsHindi] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [sosSent, setSosSent] = useState(false)
  const [sosLoading, setSosLoading] = useState(false)

  const [vitalForm, setVitalForm] = useState({ blood_pressure: '', sugar_level: '', temperature: '', weight: '', heart_rate: '', notes: '' })
  const [savingVital, setSavingVital] = useState(false)

  const [ecForm, setEcForm] = useState({ name: '', phone: '', relation: '' })
  const [savingEc, setSavingEc] = useState(false)

  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle'|'success'|'error'>('idle')

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'bot', text: "Hello! I'm your AI health assistant 👋 Ask me about symptoms, medicines, or to find nearby hospitals." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatRecognitionRef = useRef<any>(null)
  const [chatListening, setChatListening] = useState(false)
  const [chatSpeaking, setChatSpeaking] = useState(false)

  const [newAllergy, setNewAllergy] = useState('')
  const [savingAllergy, setSavingAllergy] = useState(false)
  const [allergyMsg, setAllergyMsg] = useState('')

  const t = (key: string) => isHindi && HINDI[key] ? HINDI[key] : key

  useEffect(() => {
    setIsOnline(navigator.onLine)
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    const session = localStorage.getItem('patient_session')
    if (!session) { router.push('/auth?role=patient'); return }
    const profile = JSON.parse(session)
    setUser(profile)

    const loadData = async () => {
      if (profile?.patient_id) {
        const pid = profile.patient_id
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${pid}`)
          if (res.ok) setPatient(await res.json())
        } catch {}

        const [rxRes, ntRes, dcRes, vtRes, rmRes, ecRes] = await Promise.all([
          supabase.from('prescriptions').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
          supabase.from('doctor_notes').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
          supabase.from('documents').select('*').eq('patient_id', pid).order('created_at', { ascending: false }),
          supabase.from('vitals').select('*').eq('patient_id', pid).order('recorded_at', { ascending: false }),
          supabase.from('medicine_reminders').select('*').eq('patient_id', pid).eq('active', true),
          supabase.from('emergency_contacts').select('*').eq('patient_id', pid),
        ])
        setPrescriptions(rxRes.data || [])
        setNotes(ntRes.data || [])
        setDocs(dcRes.data || [])
        setVitals(vtRes.data || [])
        setReminders(rmRes.data || [])
        setEmergencyContacts(ecRes.data || [])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSignOut = () => { localStorage.removeItem('patient_session'); router.push('/') }

  const handleSOS = async () => {
    setSosLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: user?.name || 'Unknown',
          patient_id: user?.patient_id || '',
          blood_type: patient?.blood_type || 'Unknown',
          allergies: patient?.allergies || 'Unknown',
          medications: patient?.medications || 'None',
          emergency_contact: emergencyContacts[0]?.phone || 'None'
        })
      })
      if (res.ok) setSosSent(true)
    } catch {}
    setSosLoading(false)
  }

  const downloadPrescription = async (rx: any) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/prescription/pdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patient?.name || user?.name,
          patient_id: user?.patient_id,
          doctor_name: rx.doctor_name,
          medications: rx.medications || [],
          ai_diagnosis: rx.ai_diagnosis || '',
          notes: rx.notes || '',
          date: new Date(rx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `prescription_${user?.patient_id}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { alert('Backend not running. Cannot generate PDF.') }
  }

  const saveVitals = async () => {
    if (!Object.values(vitalForm).some(v => v.trim())) return
    setSavingVital(true)
    const { data } = await supabase.from('vitals').insert({
      patient_id: user?.patient_id, ...vitalForm, recorded_at: new Date().toISOString()
    }).select().single()
    if (data) { setVitals([data, ...vitals]); setVitalForm({ blood_pressure: '', sugar_level: '', temperature: '', weight: '', heart_rate: '', notes: '' }) }
    setSavingVital(false)
  }

  const saveEmergencyContact = async () => {
    if (!ecForm.name || !ecForm.phone) return
    setSavingEc(true)
    const { data } = await supabase.from('emergency_contacts').insert({ patient_id: user?.patient_id, ...ecForm }).select().single()
    if (data) { setEmergencyContacts([...emergencyContacts, data]); setEcForm({ name: '', phone: '', relation: '' }) }
    setSavingEc(false)
  }

  // FIX: Allergy update — clean URL with forward slashes
  const saveNewAllergy = async () => {
    if (!newAllergy.trim() || !patient) return
    setSavingAllergy(true); setAllergyMsg('')
    const updated = patient.allergies === 'None known' ? newAllergy.trim() : patient.allergies + ', ' + newAllergy.trim()
    try {
      const url = process.env.NEXT_PUBLIC_API_URL + '/api/patients/' + user.patient_id + '/allergies'
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: updated })
      })
      setPatient({ ...patient, allergies: updated })
      setNewAllergy('')
      setAllergyMsg('✅ Allergy updated!')
      setTimeout(() => setAllergyMsg(''), 3000)
    } catch { setAllergyMsg('Error updating. Make sure backend is running.') }
    setSavingAllergy(false)
  }

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) { setOcrFile(files[0]); setOcrResult(''); setOcrError(''); setUploadStatus('idle') }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/jpeg': ['.jpg','.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] }, maxSize: 10*1024*1024, multiple: false,
  })

  const handleScanUpload = async () => {
    if (!ocrFile || !user?.patient_id) return
    setOcrLoading(true); setOcrError(''); setOcrResult(''); setUploadProgress(0)
    try {
      const iv = setInterval(() => setUploadProgress(p => p < 70 ? p+10 : p), 200)
      const formData = new FormData()
      formData.append('file', ocrFile); formData.append('patient_id', user.patient_id)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      clearInterval(iv)
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')
      setUploadProgress(80)
      const { data: dc } = await supabase.from('documents').select('*').eq('patient_id', user.patient_id).order('created_at', { ascending: false })
      setDocs(dc || [])
      if (ocrFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.readAsDataURL(ocrFile)
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1]
            const ocrRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ocr`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_base64: base64, patient_id: user.patient_id })
            })
            if (ocrRes.ok) { const d = await ocrRes.json(); setOcrResult(d.extracted_text || 'Could not extract text.') }
            else setOcrResult('File uploaded. OCR backend not available.')
          } catch { setOcrResult('File saved. OCR failed.') }
          setUploadProgress(100); setUploadStatus('success'); setOcrLoading(false)
        }
      } else {
        setOcrResult('PDF uploaded to your records.')
        setUploadProgress(100); setUploadStatus('success'); setOcrLoading(false)
      }
    } catch (e: any) { setOcrError(e.message); setUploadStatus('error'); setOcrLoading(false) }
  }

  // FIX: sendMessage — await res.json() extracted before setMessages
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim(); setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const patientCtx = patient ? `Patient: ${patient.name}, Age ${patient.age}, Blood ${patient.blood_type}, Allergies: ${patient.allergies}.` : ''
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat-segmented`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, patient_context: patientCtx })
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'bot', segments: data }])
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: 'Connection error. For emergencies call 112 🚨' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Backend not connected. Call 112 for emergencies. 🚨' }])
    }
    setChatLoading(false)
  }

  // Voice for chatbot
  const startChatVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Use Chrome for voice'); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-IN'; recognition.continuous = false; recognition.interimResults = false
    recognition.onstart = () => setChatListening(true)
    recognition.onresult = (e: any) => { setChatInput(e.results[0][0].transcript); setChatListening(false) }
    recognition.onerror = () => setChatListening(false)
    recognition.onend = () => setChatListening(false)
    chatRecognitionRef.current = recognition; recognition.start()
  }

  const speakBotMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-IN'; u.rate = 0.9
    u.onstart = () => setChatSpeaking(true); u.onend = () => setChatSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const timeline = [
    ...prescriptions.map(rx => ({ type: 'prescription', date: rx.created_at, title: 'Prescription issued', desc: rx.medications?.map((m: any) => m.name).join(', '), icon: '💊', color: 'bg-blue-500' })),
    ...notes.filter(n => !n.note.startsWith('PRESCRIPTION')).map(n => ({ type: 'note', date: n.created_at, title: 'Doctor Note', desc: n.note.substring(0, 80) + (n.note.length > 80 ? '...' : ''), icon: '📋', color: 'bg-purple-500' })),
    ...vitals.map(v => ({ type: 'vital', date: v.recorded_at, title: 'Vitals Recorded', desc: [v.blood_pressure && `BP: ${v.blood_pressure}`, v.sugar_level && `Sugar: ${v.sugar_level}`, v.temperature && `Temp: ${v.temperature}°`].filter(Boolean).join(' · '), icon: '📊', color: 'bg-emerald-500' })),
    ...docs.map(d => ({ type: 'doc', date: d.created_at, title: 'Report Uploaded', desc: d.file_url?.split('/').pop()?.split('_').slice(1).join('_'), icon: '📄', color: 'bg-violet-500' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const QUICK = ['I have chest pain', 'Find nearest hospital', 'Symptoms of diabetes', 'I have high fever']

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-slate-500">Loading...</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {!isOnline && <div className="bg-amber-500 text-white text-center py-2 text-sm font-semibold">⚠️ You are offline — showing cached data</div>}

      {sosSent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <p className="text-6xl mb-4">🚨</p>
            <h2 className="text-2xl font-black text-red-600 mb-2">SOS Alert Sent!</h2>
            <p className="text-slate-600 mb-2">Your medical details have been logged for emergency responders.</p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left text-sm">
              <p><span className="font-bold">Blood Type:</span> {patient?.blood_type}</p>
              <p><span className="font-bold">Allergies:</span> {patient?.allergies}</p>
              <p><span className="font-bold">Current Meds:</span> {patient?.medications}</p>
            </div>
            <a href="tel:112" className="block w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-red-700 mb-3">📞 Call 112 NOW</a>
            <button onClick={() => setSosSent(false)} className="text-slate-500 text-sm underline">Close</button>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center"><span className="text-white font-black text-sm">S</span></div>
          <div><span className="font-bold text-slate-800 text-lg">Smriti</span><span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Patient</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsHindi(!isHindi)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${isHindi ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
            {isHindi ? 'EN' : 'हिं'}
          </button>
          <button onClick={handleSOS} disabled={sosLoading}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 animate-pulse">
            🚨 SOS
          </button>
          {user?.name && <div className="flex items-center gap-2"><div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</div><span className="text-sm font-medium text-slate-700 hidden md:block">{user.name}</span></div>}
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-xl">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span className="hidden md:inline">{t('Sign Out')}</span>
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">{t('Hello')}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1">{t('Your complete health portal')}</p>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-200 text-xs uppercase tracking-wider mb-1">{t('Your Patient ID')}</p>
              <p className="text-2xl font-black font-mono">{user?.patient_id || 'Not assigned'}</p>
              <p className="text-emerald-200 text-sm mt-1">{t('Share this with your doctor')}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold">{user?.name?.charAt(0) || '?'}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[{label:t('Prescriptions'),value:prescriptions.length,color:'text-blue-600'},{label:t('Doctor Notes'),value:notes.length,color:'text-purple-600'},{label:'Reports',value:docs.length,color:'text-emerald-600'}].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 mt-1">{s.label}</p></div>
          ))}
        </div>

        {reminders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">💊 Medicine Reminders</p>
            <div className="flex flex-wrap gap-2">
              {reminders.map((r, i) => (
                <span key={i} className="bg-white border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">{r.medicine_name} {r.dose} — {r.time_of_day}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-0.5 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 mb-6 overflow-x-auto">
          {TABS.map((t2, i) => (
            <button key={t2.label} onClick={() => setActiveTab(i)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-0.5 min-w-[60px] ${activeTab === i ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
              <span>{t2.icon}</span><span className="hidden lg:inline ml-0.5">{t(t2.label)}</span>
            </button>
          ))}
        </div>

        {/* TAB 0: PROFILE */}
        {activeTab === 0 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">My Medical Profile</h2>
              {patient ? (
                <div className="space-y-3">
                  {[['Full Name',patient.name,false],['Age',patient.age+' years',false],['Blood Group',patient.blood_type,false],['Known Allergies',patient.allergies,true],['Current Medications',patient.medications,false]].map(([k,v,isRed]: any) => (
                    <div key={k} className="flex gap-4 py-3 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500 w-44 shrink-0">{k}</span>
                      <span className={`text-sm font-medium ${isRed ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>{v}</span>
                    </div>
                  ))}
                  {/* UPDATE ALLERGIES */}
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Update Known Allergies</h3>
                    {allergyMsg && <p className={`text-xs mb-2 font-medium ${allergyMsg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{allergyMsg}</p>}
                    <div className="flex gap-2">
                      <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveNewAllergy()}
                        placeholder="Add new allergy e.g. Amoxicillin"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                      <button onClick={saveNewAllergy} disabled={savingAllergy || !newAllergy.trim()}
                        className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                        {savingAllergy ? '...' : '+ Add'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Current: <span className="text-red-600 font-medium">{patient.allergies}</span></p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-3xl mb-2">🔗</p>
                  <p>Share ID <span className="font-mono font-semibold text-emerald-600">{user?.patient_id}</span> with doctor.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">🚨 Emergency Contacts</h2>
              {emergencyContacts.map((ec, i) => (
                <div key={i} className="flex items-center gap-3 bg-red-50 rounded-xl p-3 mb-2">
                  <span className="text-2xl">👤</span>
                  <div><p className="font-semibold text-slate-800 text-sm">{ec.name} ({ec.relation})</p><p className="text-xs text-slate-500">{ec.phone}</p></div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <input value={ecForm.name} onChange={e => setEcForm({...ecForm, name: e.target.value})} placeholder="Name" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                <input value={ecForm.phone} onChange={e => setEcForm({...ecForm, phone: e.target.value})} placeholder="+91 phone" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
                <input value={ecForm.relation} onChange={e => setEcForm({...ecForm, relation: e.target.value})} placeholder="Relation" className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>
              </div>
              <button onClick={saveEmergencyContact} disabled={savingEc || !ecForm.name || !ecForm.phone} className="mt-2 bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                + Add Contact
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: PRESCRIPTIONS */}
        {activeTab === 1 && (
          <div className="fade-in space-y-4">
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100">
                <p className="text-4xl mb-3">💊</p><p className="font-medium">{t('No prescriptions yet')}</p>
                <p className="text-sm mt-1">Your doctor must prescribe to ID: <span className="font-mono font-semibold text-emerald-600">{user?.patient_id}</span></p>
              </div>
            ) : prescriptions.map((rx, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-800">Dr. {rx.doctor_name}</span>
                    {rx.ai_diagnosis && <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{rx.ai_diagnosis}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(rx.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                    <button onClick={() => downloadPrescription(rx)} className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-700">⬇️ PDF</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rx.medications?.map((m: any, j: number) => <span key={j} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium px-3 py-1.5 rounded-full">💊 {m.name}</span>)}
                </div>
                {rx.notes && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">{rx.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: NOTES */}
        {activeTab === 2 && (
          <div className="fade-in space-y-4">
            {notes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100"><p className="text-4xl mb-3">📋</p><p className="font-medium">{t('No doctor notes yet')}</p></div>
            ) : notes.map((n, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-purple-700">Dr. {n.doctor_name}</span><span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
                <p className="text-sm text-slate-600">{n.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: VITALS */}
        {activeTab === 3 && (
          <div className="fade-in space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-4">📊 Log Today's Vitals</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {[
                  { key: 'blood_pressure', label: 'Blood Pressure', placeholder: 'e.g. 120/80' },
                  { key: 'sugar_level', label: 'Sugar Level (mg/dL)', placeholder: 'e.g. 95' },
                  { key: 'temperature', label: 'Temperature (°F)', placeholder: 'e.g. 98.6' },
                  { key: 'weight', label: 'Weight (kg)', placeholder: 'e.g. 65' },
                  { key: 'heart_rate', label: 'Heart Rate (bpm)', placeholder: 'e.g. 72' },
                  { key: 'notes', label: 'Notes', placeholder: 'Feeling...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">{f.label}</label>
                    <input value={(vitalForm as any)[f.key]} onChange={e => setVitalForm({...vitalForm, [f.key]: e.target.value})}
                      placeholder={f.placeholder} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                  </div>
                ))}
              </div>
              <button onClick={saveVitals} disabled={savingVital} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50">
                {savingVital ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
            {vitals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-800">Vitals History ({vitals.length})</h2></div>
                <div className="divide-y divide-slate-50">
                  {vitals.map((v, i) => (
                    <div key={i} className="px-6 py-4">
                      <p className="text-xs text-slate-400 mb-2">{new Date(v.recorded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                      <div className="flex flex-wrap gap-2">
                        {v.blood_pressure && <span className="bg-red-50 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">❤️ BP: {v.blood_pressure}</span>}
                        {v.sugar_level && <span className="bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">🩸 Sugar: {v.sugar_level}</span>}
                        {v.temperature && <span className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full">🌡️ Temp: {v.temperature}°</span>}
                        {v.weight && <span className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-full">⚖️ {v.weight} kg</span>}
                        {v.heart_rate && <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">💓 {v.heart_rate} bpm</span>}
                      </div>
                      {v.notes && <p className="text-xs text-slate-500 mt-2">{v.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCAN REPORTS */}
        {activeTab === 4 && (
          <div className="fade-in space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-white text-lg">🔍</div>
                <div><h2 className="font-bold text-slate-800">Scan & Upload Medical Report</h2><p className="text-slate-500 text-sm">AI reads and extracts your medical data</p></div>
              </div>
              {uploadStatus !== 'success' && (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-violet-500 bg-violet-50' : ocrFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50'}`}>
                  <input {...getInputProps()}/>
                  {ocrFile ? <div><p className="text-4xl mb-3">📄</p><p className="font-semibold text-slate-700">{ocrFile.name}</p><p className="text-xs text-emerald-600 mt-2 font-medium">Ready to scan</p></div>
                    : <div><p className="text-4xl mb-3">☁️</p><p className="text-slate-600 font-medium">Drag & drop your report</p><p className="text-slate-400 text-sm mt-1">PDF, JPG, PNG — max 10MB</p></div>}
                </div>
              )}
              {ocrLoading && <div className="mt-5"><div className="flex justify-between text-sm text-slate-500 mb-2"><span>Uploading & scanning...</span><span>{uploadProgress}%</span></div><div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-violet-500 h-2.5 rounded-full transition-all" style={{width:`${uploadProgress}%`}}/></div></div>}
              {ocrError && <div className="mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">❌ {ocrError}</div>}
              {uploadStatus !== 'success' && <button onClick={handleScanUpload} disabled={!ocrFile || ocrLoading} className="mt-5 w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40">{ocrLoading ? 'Scanning...' : '🔍 Upload & Scan Report'}</button>}
            </div>
            {ocrResult && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 fade-in">
                <div className="flex justify-between mb-4"><h3 className="font-bold text-slate-800">✅ Extracted Medical Data</h3><button onClick={() => { setOcrFile(null); setOcrResult(''); setUploadStatus('idle') }} className="text-xs text-violet-600 underline">Upload another</button></div>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{ocrResult}</div>
              </div>
            )}
            {docs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-800">My Reports ({docs.length})</h2></div>
                <div className="divide-y divide-slate-50">
                  {docs.map((doc, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">📄</div>
                        <div><p className="text-sm font-medium text-slate-700 truncate max-w-xs">{doc.file_url?.split('/').pop()?.split('_').slice(1).join('_')}</p><p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p></div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 font-semibold border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50">View</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: TIMELINE */}
        {activeTab === 5 && (
          <div className="fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-800">Health Timeline ({timeline.length} events)</h2></div>
              {timeline.length === 0 ? (
                <div className="p-12 text-center text-slate-400"><p className="text-4xl mb-3">📅</p><p>No health events yet. Start by visiting a doctor!</p></div>
              ) : (
                <div className="p-6">
                  {timeline.map((event, i) => (
                    <div key={i} className="flex gap-4 mb-6 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 ${event.color} rounded-full flex items-center justify-center text-white text-sm shrink-0`}>{event.icon}</div>
                        {i < timeline.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 mt-2"/>}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-800 text-sm">{event.title}</p>
                          <p className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        </div>
                        <p className="text-sm text-slate-500">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AI CHATBOT */}
        {activeTab === 6 && (
          <div className="fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div>
                <div><h2 className="font-bold text-white">AI Health Assistant</h2><p className="text-blue-200 text-xs">Groq · 24/7 · Not a replacement for real doctors</p></div>
                <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"/>
              </div>
              <div className="px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto">
                {QUICK.map((q, i) => <button key={i} onClick={() => setChatInput(q)} className="whitespace-nowrap text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 shrink-0">{q}</button>)}
              </div>
              <div className="h-[450px] overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-2 shrink-0 mt-1">🤖</div>}
                    {msg.role === 'user' ? (
                      <div className="max-w-xs md:max-w-md bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm">{msg.text}</div>
                    ) : msg.segments ? (
                      <div className="max-w-lg space-y-3 flex-1">
                        {msg.segments.cause && (
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">🩺 Possible Cause</p>
                              <button onClick={() => speakBotMessage(msg.segments.cause)}
                                className={`text-xs px-2 py-1 rounded-lg ${chatSpeaking ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                {chatSpeaking ? '🔇 Stop' : '🔊'}
                              </button>
                            </div>
                            <p className="text-sm text-slate-700">{msg.segments.cause}</p>
                          </div>
                        )}
                        {msg.segments.hospitals && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">🏥 Nearby Hospitals</p>
                            <p className="text-sm text-slate-700 mb-3">{msg.segments.hospitals}</p>
                            <a href={`https://www.google.com/maps/search/${encodeURIComponent(msg.segments.mapQuery || 'hospital near me')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 w-fit">
                              📍 Open on Google Maps
                            </a>
                          </div>
                        )}
                        {msg.segments.doctors && (
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">👨‍⚕️ Recommended Specialist</p>
                            <p className="text-sm text-slate-700 mb-3">{msg.segments.doctors}</p>
                            <a href={`https://www.google.com/maps/search/${encodeURIComponent((msg.segments.specialist || 'doctor')+' near me')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-purple-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-purple-700 w-fit">
                              📍 Find {msg.segments.specialist || 'Doctor'} on Map
                            </a>
                          </div>
                        )}
                        {msg.segments.action && (
                          <div className={`border rounded-2xl p-4 ${msg.segments.emergency ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${msg.segments.emergency ? 'text-red-600' : 'text-amber-600'}`}>{msg.segments.emergency ? '🚨 Emergency Action' : '💡 Recommended Action'}</p>
                            <p className={`text-sm font-medium ${msg.segments.emergency ? 'text-red-700' : 'text-slate-700'}`}>{msg.segments.action}</p>
                            {msg.segments.emergency && <a href="tel:112" className="mt-3 flex items-center gap-2 bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl w-fit">📞 Call 112 Now</a>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-xs md:max-w-md bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">{msg.text}</div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-2">🤖</div>
                    <div className="bg-slate-100 rounded-2xl px-4 py-3"><div className="flex gap-1">{[0,150,300].map(d => <div key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
              <div className="px-4 py-4 border-t border-slate-100 flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about symptoms, medicines, nearby doctors..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <button onClick={startChatVoice}
                  className={`px-3 py-2.5 rounded-xl border transition-colors ${chatListening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  title="Voice input">🎤</button>
                <button onClick={startChatVoice}
  className={chatListening
    ? 'px-3 py-2.5 rounded-xl border bg-red-500 text-white border-red-500 animate-pulse'
    : 'px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300'}
  title="Voice input">🎤</button>
              </div>
              {chatListening && <p className="px-4 pb-2 text-xs text-red-500 animate-pulse">🎤 Listening... speak now</p>}
              <div className="px-4 pb-3 text-center"><p className="text-xs text-slate-400">🚨 Emergencies: call <strong>112</strong> immediately.</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
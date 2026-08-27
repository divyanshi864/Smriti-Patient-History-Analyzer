'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { supabase } from '@/lib/supabase'
import { useDropzone } from 'react-dropzone'
import {
  User, Pill, ClipboardList, Activity, FileSearch, Calendar, Bot,
  AlertTriangle, Phone, FileText, Download, UserPlus, Info, CheckCircle,
  CloudUpload, Mic, Send, MapPin, Search, HeartPulse, Droplet, Thermometer,
  Scale, Stethoscope, Link
} from 'lucide-react'

const TABS = [
  { label: 'My Profile', icon: <User size={20} /> },
  { label: 'Prescriptions', icon: <Pill size={20} /> },
  { label: 'Doctor Notes', icon: <ClipboardList size={20} /> },
  { label: 'Vitals', icon: <Activity size={20} /> },
  { label: 'Scan Reports', icon: <FileSearch size={20} /> },
  { label: 'Timeline', icon: <Calendar size={20} /> },
  { label: 'AI Assistant', icon: <Bot size={20} /> },
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

const getPatientPhoto = (name: string) => {
  const fPhotos = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&h=256&auto=format&fit=crop',
  ];
  const mPhotos = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=256&h=256&auto=format&fit=crop',
  ];
  if (!name) return mPhotos[0];
  const lower = name.toLowerCase();

  let hash = 0;
  for (let i = 0; i < lower.length; i++) hash += lower.charCodeAt(i);

  const femaleNames = ['sarah', 'emma', 'priya', 'smriti', 'jane'];
  const isFemale = femaleNames.some(f => lower.includes(f)) || lower.endsWith('a') || lower.endsWith('i');
  return isFemale ? fPhotos[hash % fPhotos.length] : mPhotos[hash % mPhotos.length];
};

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
  const [patientImage, setPatientImage] = useState<string | null>(null)
  const patientFileInputRef = useRef<HTMLInputElement>(null)

  const [vitalForm, setVitalForm] = useState({ blood_pressure: '', sugar_level: '', temperature: '', weight: '', heart_rate: '', notes: '' })
  const [savingVital, setSavingVital] = useState(false)

  const [ecForm, setEcForm] = useState({ name: '', phone: '', relation: '' })
  const [savingEc, setSavingEc] = useState(false)

  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')

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
  const [updatingGender, setUpdatingGender] = useState(false)
  const [syncingWatch, setSyncingWatch] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const t = (key: string) => isHindi && HINDI[key] ? HINDI[key] : key

  useEffect(() => {
    setIsOnline(navigator.onLine)
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('patient_session')
      if (session) {
        const profile = JSON.parse(session)
        const cached = localStorage.getItem(`patient_image_${profile.patient_id}`)
        if (cached) setPatientImage(cached)
      }
    }

    const session = localStorage.getItem('patient_session')
    if (!session) { router.push('/auth?role=patient'); return }
    const profile = JSON.parse(session)
    setUser(profile)

    const loadData = async () => {
      if (profile?.patient_id) {
        const pid = profile.patient_id
        try {
          const { data } = await supabase.from('patients').select('*').eq('id', pid).single()
          if (data) setPatient(data)
        } catch { }

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

  const handlePatientImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setPatientImage(base64)
      if (typeof window !== 'undefined' && user?.patient_id) {
        localStorage.setItem(`patient_image_${user.patient_id}`, base64)
      }
    }
    reader.readAsDataURL(file)
  }

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
    } catch { }
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

  const syncGoogleFitData = async () => {
    if (!user?.patient_id) return
    setSyncingWatch(true)
    setSyncMsg('')
    try {
      if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
        alert('Google Identity Services loading... please try again in a few seconds.')
        setSyncingWatch(false)
        return
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
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
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vitals/google-fit-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  patient_id: user.patient_id,
                  access_token: tokenResponse.access_token
                })
              })
              if (res.ok) {
                const data = await res.json()
                setVitals((prev: any[]) => [data, ...prev])
                setSyncMsg('✅ Smartwatch data synced successfully!')
                setTimeout(() => setSyncMsg(''), 4000)
              } else {
                setSyncMsg('⚠️ Sync completed with no new data points')
                setTimeout(() => setSyncMsg(''), 4000)
              }
            } catch {
              setSyncMsg('❌ Failed to connect to backend sync server')
              setTimeout(() => setSyncMsg(''), 4000)
            }
          }
          setSyncingWatch(false)
        },
        error_callback: () => {
          setSyncingWatch(false)
        }
      })
      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      console.error(err)
      setSyncingWatch(false)
    }
  }

  const saveEmergencyContact = async () => {
    if (!ecForm.name || !ecForm.phone) return
    setSavingEc(true)
    const { data } = await supabase.from('emergency_contacts').insert({ patient_id: user?.patient_id, ...ecForm }).select().single()
    if (data) { setEmergencyContacts([...emergencyContacts, data]); setEcForm({ name: '', phone: '', relation: '' }) }
    setSavingEc(false)
  }

  // FIX: Allergy update via Supabase Directly
  const saveNewAllergy = async () => {
    if (!newAllergy.trim() || !user?.patient_id) return
    setSavingAllergy(true); setAllergyMsg('')
    let currentAllergies = patient?.allergies || '';
    if (currentAllergies.toLowerCase().includes('none') || currentAllergies.trim() === '') {
      currentAllergies = '';
    }
    const updated = currentAllergies ? currentAllergies + ', ' + newAllergy.trim() : newAllergy.trim()

    try {
      const { error } = await supabase.from('patients').update({ allergies: updated }).eq('id', user.patient_id)
      if (error) throw error
      setPatient({ ...(patient || {}), allergies: updated })
      setNewAllergy('')
      setAllergyMsg('✅ Allergy updated!')
      setTimeout(() => setAllergyMsg(''), 3000)
    } catch { setAllergyMsg('Failed to update allergies') }
    setSavingAllergy(false)
  }
  
  const handleGenderUpdate = async (newGender: string) => {
    if (!user?.patient_id) return
    setUpdatingGender(true)
    try {
      const { error } = await supabase.from('patients').update({ gender: newGender }).eq('id', user.patient_id)
      if (!error) {
        await supabase.from('user_profiles').update({ gender: newGender }).eq('patient_id', user.patient_id)
        const updatedUser = { ...user, gender: newGender }
        setUser(updatedUser)
        setPatient((prev: any) => ({ ...prev, gender: newGender }))
        localStorage.setItem('patient_session', JSON.stringify(updatedUser))
      }
    } catch (err) {}
    setUpdatingGender(false)
  }

  const onDrop = useCallback((files: File[]) => {
    if (files.length > 0) { setOcrFile(files[0]); setOcrResult(''); setOcrError(''); setUploadStatus('idle') }
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf'] }, maxSize: 10 * 1024 * 1024, multiple: false,
  })

  const handleScanUpload = async () => {
    if (!ocrFile || !user?.patient_id) return
    setOcrLoading(true); setOcrError(''); setOcrResult(''); setUploadProgress(0)
    try {
      const iv = setInterval(() => setUploadProgress(p => p < 70 ? p + 10 : p), 200)
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
    ...prescriptions.map(rx => ({ type: 'prescription', date: rx.created_at, title: 'Prescription issued', desc: rx.medications?.map((m: any) => m.name).join(', '), icon: <Pill size={20} />, color: 'bg-blue-500' })),
    ...notes.filter(n => !n.note.startsWith('PRESCRIPTION')).map(n => ({ type: 'note', date: n.created_at, title: 'Doctor Note', desc: n.note.substring(0, 80) + (n.note.length > 80 ? '...' : ''), icon: <ClipboardList size={20} />, color: 'bg-purple-500' })),
    ...vitals.map(v => ({ type: 'vital', date: v.recorded_at, title: 'Vitals Recorded', desc: [v.blood_pressure && `BP: ${v.blood_pressure}`, v.sugar_level && `Sugar: ${v.sugar_level}`, v.temperature && `Temp: ${v.temperature}°`].filter(Boolean).join(' · '), icon: <Activity size={20} />, color: 'bg-emerald-500' })),
    ...docs.map(d => ({ type: 'doc', date: d.created_at, title: 'Report Uploaded', desc: d.file_url?.split('/').pop()?.split('_').slice(1).join('_'), icon: <FileText size={20} />, color: 'bg-violet-500' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const QUICK = ['I have chest pain', 'Find nearest hospital', 'Symptoms of diabetes', 'I have high fever']

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-slate-500">Loading...</p></div>
    </div>
  )

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#1E293B]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
    ` }} />
      {!isOnline && <div className="fixed top-0 left-0 right-0 z-[1000] bg-error text-on-error text-center p-2 text-xs font-bold">⚠️ You are offline — showing cached data</div>}

      {sosSent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(24px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '40px', padding: '48px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.4)', border: '1px solid rgba(239, 68, 68, 0.1)' }} className="animate-in zoom-in-95 duration-300">
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', margin: '0 auto 24px auto', border: '1px solid #FEE2E2' }}>
              <AlertTriangle size={48} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#B91C1C', marginBottom: '8px', letterSpacing: '-0.5px' }}>SOS Alert Active</h2>
            <p style={{ color: '#64748B', fontSize: '15px', fontWeight: '600', marginBottom: '32px' }}>Emergency responders have been notified with your clinical profile.</p>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '24px', padding: '24px', textAlign: 'left', marginBottom: '32px', border: '1px solid #E2E8F0' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94A3B8', fontWeight: '700' }}>ATTACHED CLINICAL DATA</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: '700', color: '#475569' }}>Blood Type:</span> <span style={{ fontWeight: '800', color: '#B91C1C' }}>{patient?.blood_type}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: '700', color: '#475569' }}>Allergies:</span> <span style={{ fontWeight: '800', color: '#B91C1C' }}>{patient?.allergies}</span></div>
              </div>
            </div>

            <a href="tel:112" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', backgroundColor: '#EF4444', color: 'white', padding: '20px', borderRadius: '20px', fontWeight: '900', fontSize: '20px', textDecoration: 'none', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)', marginBottom: '16px' }}>
              <Phone size={24} /> CALL 112 NOW
            </a>
            <button onClick={() => setSosSent(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Dismiss Alert</button>
          </div>
        </div>
      )}

      {/* TopAppBar */}
      {/* Content Header */}
      <div className="md:pl-[304px] pl-6 pr-6" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90, background: 'rgba(248, 250, 252, 1)', borderBottom: '1px solid rgba(0, 102, 132, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo2.png" alt="Smriti Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.5px' }}>Smriti Patient Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={handleSOS} disabled={sosLoading} style={{ backgroundColor: '#EF4444', color: 'white', padding: '10px 24px', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', fontSize: '14px' }}>
            <AlertTriangle size={18} />
            {sosLoading ? 'SENDING...' : 'SOS EMERGENCY'}
          </button>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', backgroundColor: '#006684', cursor: 'pointer' }} onClick={() => setActiveTab(0)}>
            <img src={patientImage || getPatientPhoto(user?.name)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-[calc(100vh-72px)] mb-20 md:mb-0">
        {/* Navigation Drawer */}
        {/* Navigation Sidebar */}
        <aside className="hidden md:flex" style={{ position: 'fixed', left: 0, top: 0, width: '280px', height: '100vh', zIndex: 100, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(40px)', borderRight: '1px solid rgba(0, 102, 132, 0.08)', flexDirection: 'column', padding: '40px 32px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 102, 132, 0.2)', border: '2px solid white', backgroundColor: '#006684', position: 'relative', cursor: 'pointer' }} onClick={() => patientFileInputRef.current?.click()} className="group">
              <input type="file" accept="image/*" ref={patientFileInputRef} onChange={handlePatientImageUpload} style={{ display: 'none' }} />
              <img src={patientImage || getPatientPhoto(user?.name)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold', fontSize: '9px' }} className="group-hover:opacity-100">
                Change
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1E293B', lineHeight: '1.2' }}>{(patient?.name || user?.name)?.split(' ')[0] || 'Patient'}</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#E0F2FE', color: '#006684', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Member</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B' }}>#{user?.patient_id}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B' }}>•</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B' }}>{patient?.gender || user?.gender || 'Unknown'}</span>
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TABS.map((t2, i) => (
              <div key={i} onClick={() => setActiveTab(i)} className={activeTab === i ? "bg-white/60 shadow-sm border border-white/40 text-[#006684] rounded-xl font-bold cursor-pointer" : "text-slate-500 hover:text-[#006684] hover:bg-white/20 transition-all cursor-pointer"} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '12px', fontSize: '15px', fontWeight: activeTab === i ? 'bold' : '600' }}>
                {t2.icon} {t(t2.label)}
              </div>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={() => setIsHindi(!isHindi)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>{isHindi ? 'Switch to English' : 'हिंदी में बदलें (Hindi)'}</button>
            <button onClick={handleSignOut} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-[280px]" style={{ flex: 1, padding: '32px 24px', minHeight: '100vh', position: 'relative', zIndex: 10 }}>
          {activeTab === 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section style={{ 
                marginBottom: '56px', 
                padding: '48px', 
                borderRadius: '40px', 
                background: 'rgba(255, 255, 255, 0.5)', 
                backdropFilter: 'blur(40px)', 
                border: '1px solid rgba(255, 255, 255, 0.7)',
                boxShadow: '0 20px 50px -15px rgba(0, 102, 132, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '48px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Aesthetic Background Shape */}
                <div style={{ 
                  position: 'absolute', 
                  left: '-20px', 
                  top: '-20px', 
                  width: '180px', 
                  height: '180px', 
                  background: 'linear-gradient(135deg, rgba(38, 230, 255, 0.1) 0%, rgba(0, 102, 132, 0.05) 100%)', 
                  borderRadius: '40px', 
                  transform: 'rotate(-10deg)',
                  zIndex: 0
                }} />

                {/* Photo Section with "Card Behind" effect */}
                <div style={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>
                  <div style={{ 
                    width: '130px', 
                    height: '130px', 
                    borderRadius: '32px', 
                    backgroundColor: 'white', 
                    padding: '8px', 
                    boxShadow: '0 15px 35px -5px rgba(0, 102, 132, 0.2)',
                    transform: 'rotate(2deg)'
                  }}>
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '24px', 
                      overflow: 'hidden', 
                      position: 'relative', 
                      cursor: 'pointer' 
                    }} onClick={() => patientFileInputRef.current?.click()} className="group">
                      <img src={patientImage || getPatientPhoto(user?.name)} alt="Patient Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold' }} className="group-hover:opacity-100">
                        Update
                      </div>
                    </div>
                  </div>
                  {/* Status Accent */}
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#22C55E', border: '3px solid white', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)' }} />
                </div>

                {/* Textual Insight Overlay */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>
                      Patient ID: <span style={{ color: '#1E293B' }}>#{user?.patient_id}</span>
                    </span>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>
                      Gender: <span style={{ color: '#1E293B' }}>{patient?.gender || user?.gender || 'Unknown'}</span>
                    </span>
                  </div>
                  <h1 style={{ fontWeight: '800', fontSize: '56px', letterSpacing: '-0.04em', color: '#1E293B', margin: '0', lineHeight: 1 }}>
                    Hello, {(patient?.name || user?.name)?.split(' ')[0] || 'Patient'}
                  </h1>
                  <p style={{ fontWeight: '600', fontSize: '18px', color: '#64748B', margin: '8px 0 0 0', maxWidth: '480px', lineHeight: 1.5 }}>
                    Welcome back to your personalized health portal. Your vitals are <strong style={{ color: '#059669' }}>stable</strong> and all systems are performing optimally.
                  </p>
                </div>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                {[
                  { label: 'Prescriptions', value: prescriptions.length, icon: <Pill size={20} />, color: '#006684', bg: '#E0F2FE' },
                  { label: 'Doctor Notes', value: notes.length, icon: <FileText size={20} />, color: '#8B5CF6', bg: '#F5F3FF' },
                  { label: 'Reports', value: docs.length, icon: <FileSearch size={20} />, color: '#059669', bg: '#ECFDF5' }
                ].map(s => (
                  <div key={s.label} onClick={() => {
                    if (s.label === 'Prescriptions') setActiveTab(1);
                    if (s.label === 'Doctor Notes') setActiveTab(2);
                    if (s.label === 'Reports') setActiveTab(4);
                  }} style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover:-translate-y-1">
                    <div style={{ color: '#64748B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '16px' }}>
                      {s.icon} {t(s.label)}
                    </div>
                    <div style={{ fontSize: '38px', fontWeight: '800', color: '#1E293B', lineHeight: '1', letterSpacing: '-1px' }}>{s.value}</div>
                  </div>
                ))}
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
                <section>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '24px', letterSpacing: '-0.5px' }}>My Medical Profile</h2>
                  <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Blood Type</label>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{patient?.blood_type?.trim() ? patient.blood_type : 'N/A'}</p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Gender</label>
                        <select 
                          value={patient?.gender || ''} 
                          onChange={(e) => handleGenderUpdate(e.target.value)}
                          disabled={updatingGender}
                          style={{ 
                            width: '100%', 
                            padding: '8px 12px', 
                            borderRadius: '10px', 
                            border: '1px solid #E2E8F0', 
                            fontSize: '14px', 
                            fontWeight: '700',
                            color: '#1E293B',
                            backgroundColor: '#F8FAFC',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Weight</label>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{vitals[0]?.weight ? `${vitals[0].weight} kg` : 'N/A'}</p>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Known Allergies</label>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{patient?.allergies?.trim() ? patient.allergies : 'None'}</p>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                          <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewAllergy()} placeholder="Add new allergy..." style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }} />
                          <button onClick={saveNewAllergy} disabled={savingAllergy || !newAllergy.trim()} style={{ backgroundColor: '#006684', color: 'white', padding: '0 20px', borderRadius: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', opacity: savingAllergy ? 0.5 : 1 }}>{savingAllergy ? 'Saving...' : 'Add'}</button>
                        </div>
                        {allergyMsg && <p style={{ fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: '600' }}>{allergyMsg}</p>}
                      </div>
                    </div>
                  </div>

                  {reminders.length > 0 && (
                    <div style={{ marginTop: '32px', padding: '24px', borderRadius: '20px', backgroundColor: 'rgba(236, 253, 245, 0.6)', border: '1px solid rgba(167, 243, 208, 0.8)', display: 'flex', alignItems: 'flex-start', gap: '16px', backdropFilter: 'blur(10px)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                        <Pill size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#064E3B' }}>Active Medication Reminders</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {reminders.map((r, i) => <span key={i} style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', color: '#047857', border: '1px solid #D1FAE5' }}>{r.medicine_name} ({r.dose}) — {r.time_of_day}</span>)}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '24px', letterSpacing: '-0.5px' }}>Emergency Contacts</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {emergencyContacts.map((ec, i) => (
                      <div key={i} style={{ padding: '20px 24px', borderRadius: '24px', backgroundColor: 'white', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#F5F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#78716C' }}>
                          <User size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1E293B' }}>{ec.name}</h4>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' }}>{ec.relation}</p>
                        </div>
                        <a href={`tel:${ec.phone}`} style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684', textDecoration: 'none' }}>
                          <Phone size={18} />
                        </a>
                      </div>
                    ))}

                    <div style={{ padding: '24px', borderRadius: '24px', border: '2px dashed #E2E8F0', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <input value={ecForm.name} onChange={e => setEcForm({ ...ecForm, name: e.target.value })} placeholder="Full Name" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px' }} />
                        <input value={ecForm.phone} onChange={e => setEcForm({ ...ecForm, phone: e.target.value })} placeholder="+91..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px' }} />
                        <input value={ecForm.relation} onChange={e => setEcForm({ ...ecForm, relation: e.target.value })} placeholder="Relation (e.g. Spouse)" style={{ gridColumn: 'span 2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px' }} />
                      </div>
                      <button onClick={saveEmergencyContact} disabled={savingEc || !ecForm.name || !ecForm.phone} style={{ width: '100%', backgroundColor: '#F1F5F9', color: '#006684', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>+ Add Primary Contact</button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Tab 1: Prescriptions */}
          {activeTab === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <h1 className="text-3xl font-extrabold text-on-surface mb-8">{t('Prescriptions')}</h1>
              <div className="flex flex-col gap-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {prescriptions.map((rx, i) => (
                    <div key={i} style={{ padding: '24px 32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9', boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.02)', transition: 'all 0.3s' }} className="hover:shadow-md hover:-translate-y-1">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684' }}>
                            <Pill size={20} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Dr. {rx.doctor_name}</h3>
                            <p style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', margin: 0 }}>{new Date(rx.created_at).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                        <button onClick={() => downloadPrescription(rx)} style={{ backgroundColor: '#F8FAFC', color: '#006684', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> Export PDF</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {rx.medications?.map((m: any, j: number) => (
                          <span key={j} style={{ backgroundColor: '#F1F5F9', color: '#334155', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>{m.name}</span>
                        ))}
                      </div>
                      {rx.notes && <p style={{ fontSize: '14px', color: '#64748B', margin: 0, padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '12px', borderLeft: '3px solid #006684' }}>{rx.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Doctor Notes */}
          {activeTab === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1E293B', marginBottom: '32px' }}>{t('Doctor Notes')}</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notes.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                    <FileText size={32} color="#94A3B8" />
                    <p style={{ color: '#64748B', fontWeight: '600', marginTop: '16px' }}>{t('No doctor notes yet')}</p>
                  </div>
                ) : notes.map((n, i) => (
                  <div key={i} style={{ padding: '24px 32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9', boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.02)', transition: 'all 0.3s' }} className="hover:shadow-md hover:-translate-y-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#8B5CF6' }}>Dr. {n.doctor_name}</h3>
                      <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '700' }}>{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>{n.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Vitals */}
          {activeTab === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
              <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Vitals & Health Metrics</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1">Live wearable telemetry and clinical health logs</p>
                </div>
              </div>

              {/* ⌚ 1. Smartwatch Live Telemetry Card (Google Fit / boAt) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[28px] p-7 text-white shadow-xl shadow-slate-900/10 mb-8 border border-slate-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
                      ⌚
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Live Telemetry</span>
                      </div>
                      <h3 className="text-xl font-black text-white">boAt Smartwatch & Google Fit Sync</h3>
                      <p className="text-xs text-slate-300 font-medium mt-1 max-w-lg">
                        Pull real-time Heart Rate, Footsteps, and Blood Oxygen (SpO₂) directly from your boAt watch or Google Fit account.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={syncGoogleFitData}
                    disabled={syncingWatch}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 flex-shrink-0 disabled:opacity-50"
                  >
                    {syncingWatch ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Connecting to boAt...</span>
                      </>
                    ) : (
                      <>
                        <span>⌚</span>
                        <span>Sync boAt Watch Now</span>
                      </>
                    )}
                  </button>
                </div>
                {syncMsg && (
                  <div className="mt-4 pt-4 border-t border-white/10 text-xs font-bold text-emerald-300 flex items-center gap-2">
                    {syncMsg}
                  </div>
                )}
              </div>

              {/* 2. Manual Metric Logging */}
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684' }}><Activity size={20} /></div>
                  Log New Metrics
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                  {[
                    { key: 'blood_pressure', label: 'Blood Pressure', placeholder: '120/80', icon: <HeartPulse size={16} /> },
                    { key: 'sugar_level', label: 'Sugar (mg/dL)', placeholder: '95', icon: <Droplet size={16} /> },
                    { key: 'temperature', label: 'Temperature (°F)', placeholder: '98.6', icon: <Thermometer size={16} /> },
                    { key: 'weight', label: 'Weight (kg)', placeholder: '65', icon: <Scale size={16} /> },
                    { key: 'heart_rate', label: 'Heart Rate (bpm)', placeholder: '72', icon: <Activity size={16} /> },
                    { key: 'notes', label: 'Daily Note', placeholder: 'How are you feeling?', icon: <FileText size={16} /> },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{f.icon} {f.label}</label>
                      <input value={(vitalForm as any)[f.key]} onChange={e => setVitalForm({ ...vitalForm, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', background: 'white' }} />
                    </div>
                  ))}
                </div>
                <button onClick={saveVitals} disabled={savingVital} style={{ backgroundColor: '#006684', color: 'white', padding: '14px 32px', borderRadius: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', opacity: savingVital ? 0.5 : 1 }}>{savingVital ? 'Saving...' : 'Save Health Record'}</button>
              </div>

              {/* 3. Historical Trends */}
              {vitals.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '24px' }}>Historical Trends</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {vitals.map((v, i) => (
                      <div key={i} style={{ padding: '24px 32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9', transition: 'all 0.3s' }}>
                        <div className="flex items-center justify-between mb-4">
                          <p style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            {new Date(v.recorded_at).toLocaleString('en-GB')}
                          </p>
                          {v.notes?.includes('Google Fit') || v.notes?.includes('boAt') ? (
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-blue-100 flex items-center gap-1">
                              ⌚ boAt Sync
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-slate-200">
                              Manual Log
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                          {v.heart_rate && <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>❤️ HR: {v.heart_rate} bpm</span>}
                          {v.steps && <span style={{ backgroundColor: '#F0FDF4', color: '#16A34A', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>👟 {Number(v.steps).toLocaleString()} steps</span>}
                          {v.spo2 && <span style={{ backgroundColor: '#ECFEFF', color: '#0891B2', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>🫁 SpO₂: {v.spo2}%</span>}
                          {v.blood_pressure && <span style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>BP: {v.blood_pressure}</span>}
                          {v.sugar_level && <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>Sugar: {v.sugar_level}</span>}
                          {v.temperature && <span style={{ backgroundColor: '#E0F2FE', color: '#0284C7', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>Temp: {v.temperature}°</span>}
                          {v.weight && <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>{v.weight} kg</span>}
                        </div>
                        {v.notes && <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748B', borderLeft: '3px solid #E2E8F0', paddingLeft: '12px' }}>{v.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Scan Reports */}
          {activeTab === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1E293B', marginBottom: '32px' }}>Medical Documents & OCR</h1>
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                    <CloudUpload size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Upload Lab Report</h2>
                    <p style={{ color: '#64748B', fontWeight: '500', fontSize: '14px', margin: '4px 0 0 0' }}>AI will analyze your document and extract clinical data automatically.</p>
                  </div>
                </div>

                {uploadStatus !== 'success' && (
                  <div {...getRootProps()} style={{ border: '2px dashed #E2E8F0', borderRadius: '24px', padding: '48px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: isDragActive ? '#F8FAFC' : 'transparent' }}>
                    <input {...getInputProps()} />
                    {ocrFile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <FileText size={48} color="#006684" />
                        <p style={{ fontWeight: '800', color: '#1E293B', marginTop: '12px' }}>{ocrFile.name}</p>
                        <p style={{ color: '#006684', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Ready to process</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <CloudUpload size={48} color="#94A3B8" />
                        <p style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', margin: '12px 0 4px 0' }}>Click or drag a report to this area</p>
                        <p style={{ color: '#94A3B8', fontSize: '14px', fontWeight: '500' }}>PDF, JPG, or PNG preferred (Max 10MB)</p>
                      </div>
                    )}
                  </div>
                )}

                {ocrLoading && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-2">
                      <span>Uploading & scanning...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {ocrError && <div className="mt-6 bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-2 font-medium text-sm"><span className="material-symbols-outlined">error</span> {ocrError}</div>}

                {uploadStatus !== 'success' && (
                  <button onClick={handleScanUpload} disabled={!ocrFile || ocrLoading} className="w-full mt-6 bg-tertiary hover:bg-tertiary-dim text-on-tertiary py-4 rounded-xl font-bold flex justify-center items-center gap-2 transition disabled:opacity-50">
                    <span className="material-symbols-outlined">search_insights</span> {ocrLoading ? 'Scanning Document...' : 'Upload & Scan'}
                  </button>
                )}
              </div>

              {ocrResult && (
                <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><CheckCircle size={20} /> Extracted Clinical Data</h3>
                    <button onClick={() => { setOcrFile(null); setOcrResult(''); setUploadStatus('idle') }} style={{ fontSize: '13px', fontWeight: '700', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Upload another</button>
                  </div>
                  <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '14px', lineHeight: '1.6', color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{ocrResult}</div>
                </div>
              )}

              {docs.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', marginBottom: '24px' }}>Document Repository</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {docs.map((doc, i) => (
                      <div key={i} style={{ padding: '16px 24px', borderRadius: '20px', backgroundColor: 'white', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} /></div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', margin: 0 }}>{doc.file_url?.split('/').pop()?.split('_').slice(1).join('_')}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>{new Date(doc.created_at).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: '700', color: '#006684', textDecoration: 'none', backgroundColor: '#E0F2FE', padding: '8px 16px', borderRadius: '12px' }}>View</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Timeline */}
          {activeTab === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1E293B', marginBottom: '32px' }}>Longitudinal Health Timeline</h1>
              {timeline.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                  <Calendar size={32} color="#94A3B8" />
                  <p style={{ color: '#64748B', fontWeight: '600', marginTop: '16px' }}>No clinical events mapped yet.</p>
                </div>
              ) : (
                <div style={{ padding: '48px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9' }}>
                  <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '48px' }}>
                    {timeline.map((event, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-33px', top: '0', width: '16px', height: '16px', borderRadius: '50%', border: '4px solid white', backgroundColor: '#006684', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}></div>
                        <div style={{ padding: '24px', borderRadius: '20px', backgroundColor: '#F8FAFC', border: '1px solid #EEF2F6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', margin: 0 }}>{event.title}</h3>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#006684', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{new Date(event.date).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: '500' }}>{event.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: AI Chat */}
          {activeTab === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl h-full flex flex-col">
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px 28px 0 0', border: '1px solid #F1F5F9', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#006684', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px -4px rgba(0, 102, 132, 0.4)' }}>
                    <Bot size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Clinical AI Assistant</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }}></span>
                      <p style={{ fontSize: '11px', color: '#22C55E', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>System Online</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', borderTop: 'none', borderBottom: 'none', padding: '16px 32px', display: 'flex', gap: '12px', overflowX: 'auto' }} className="no-scrollbar">
                {QUICK.map(q => <button key={q} onClick={() => setChatInput(q)} style={{ whiteSpace: 'nowrap', backgroundColor: 'white', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', color: '#64748B', cursor: 'pointer' }}>{q}</button>)}
              </div>

              <div style={{ backgroundColor: 'white', border: '1px solid #F1F5F9', borderTop: 'none', borderBottom: 'none', flex: 1, minHeight: '400px', maxHeight: '60vh', overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'bot' && (
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684', marginRight: '16px', marginTop: '4px', flexShrink: 0 }}>
                        <Bot size={20} />
                      </div>
                    )}

                    {msg.role === 'user' ? (
                      <div style={{ maxWidth: '75%', backgroundColor: '#006684', color: 'white', padding: '16px 20px', borderRadius: '18px 18px 4px 18px', fontSize: '14px', fontWeight: '600', lineHeight: '1.6', boxShadow: '0 4px 12px -2px rgba(0, 102, 132, 0.2)' }}>{msg.text}</div>
                    ) : msg.segments ? (
                      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {msg.segments.cause && (
                          <div style={{ backgroundColor: '#F8FAFC', padding: '24px', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#006684', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}><Stethoscope size={16} /> Clinical Insight</span>
                              <button onClick={() => speakBotMessage(msg.segments.cause)} style={{ backgroundColor: '#E0F2FE', color: '#006684', border: 'none', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>{chatSpeaking ? 'Stop Audio' : 'Play Response'}</button>
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B', lineHeight: '1.6', margin: 0 }}>{msg.segments.cause}</p>
                          </div>
                        )}
                        {msg.segments.hospitals && (
                          <div style={{ backgroundColor: '#F0FDF4', padding: '24px', borderRadius: '24px', border: '1px solid #DCFCE7' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><MapPin size={16} /> Nearby Medical Facilities</span>
                            <p style={{ fontSize: '14px', fontWeight: '500', color: '#1E293B', lineHeight: '1.6', marginBottom: '16px', margin: 0 }}>{msg.segments.hospitals}</p>
                            <a href={`https://www.google.com/maps/search/${encodeURIComponent(msg.segments.mapQuery || 'hospital')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', backgroundColor: '#166534', color: 'white', padding: '8px 16px', borderRadius: '12px', textDecoration: 'none' }}>View on Maps</a>
                          </div>
                        )}
                        {msg.segments.action && (
                          <div style={{ backgroundColor: msg.segments.emergency ? '#FEF2F2' : '#F5F3FF', padding: '24px', borderRadius: '24px', border: msg.segments.emergency ? '1px solid #FEE2E2' : '1px solid #EDE9FE' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: msg.segments.emergency ? '#991B1B' : '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>{msg.segments.emergency ? <AlertTriangle size={16} /> : <Info size={16} />} {msg.segments.emergency ? 'URGENT PROTOCOL' : 'RECOMMENDED ACTION'}</span>
                            <p style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', lineHeight: '1.6', margin: 0 }}>{msg.segments.action}</p>
                            {msg.segments.emergency && <a href="tel:112" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', backgroundColor: '#DC2626', color: 'white', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none' }}>Call Emergency Services (112)</a>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ maxWidth: '75%', backgroundColor: '#F1F5F9', color: '#1E293B', padding: '16px 20px', borderRadius: '18px 18px 18px 4px', fontSize: '14px', fontWeight: '600', lineHeight: '1.6' }}>{msg.text}</div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684', marginRight: '16px' }}><Bot size={20} /></div>
                    <div style={{ padding: '16px 24px', backgroundColor: '#F1F5F9', borderRadius: '24px', display: 'flex', gap: '6px' }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '0 0 28px 28px', border: '1px solid #F1F5F9', borderTop: 'none', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                {chatListening && <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#EF4444', color: 'white', padding: '6px 16px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', zIndex: 20 }}>LISTENING...</div>}
                <button onClick={startChatVoice} style={{ width: '48px', height: '48px', borderRadius: '14px', border: 'none', backgroundColor: chatListening ? '#EF4444' : '#F1F5F9', color: chatListening ? 'white' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}>
                  <Mic size={20} />
                </button>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Describe your symptoms or ask a question..." style={{ flex: 1, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 20px', borderRadius: '14px', outline: 'none', fontSize: '14px', fontWeight: '500' }} />
                <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} style={{ width: '48px', height: '48px', borderRadius: '14px', border: 'none', backgroundColor: '#006684', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: (chatLoading || !chatInput.trim()) ? 0.5 : 1 }}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      <nav className="flex md:hidden" style={{ position: 'fixed', bottom: '24px', left: '16px', right: '16px', height: '72px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(24px)', justifyContent: 'space-around', alignItems: 'center', zIndex: 100, borderRadius: '24px', border: '1px solid rgba(0, 102, 132, 0.1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setActiveTab(0)} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeTab === 0 ? '#006684' : '#94A3B8' }}>
          <User size={20} />
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Home</span>
        </button>
        <button onClick={() => setActiveTab(1)} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeTab === 1 ? '#006684' : '#94A3B8' }}>
          <Pill size={20} />
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meds</span>
        </button>
        <button onClick={() => setActiveTab(3)} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeTab === 3 ? '#006684' : '#94A3B8' }}>
          <Activity size={20} />
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vitals</span>
        </button>
        <button onClick={() => setActiveTab(6)} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeTab === 6 ? '#006684' : '#94A3B8' }}>
          <Bot size={20} />
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI</span>
        </button>
      </nav>
    </div>
  )

}

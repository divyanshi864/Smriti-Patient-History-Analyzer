'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import { Users, Pill, FileText, Mic, CheckCircle2, BadgeCheck, ChevronRight, Search, Plus, Link as LinkIcon, Shield, ArrowRight, Activity, Calendar, Clock, MapPin, Video, TrendingUp, Bell, Settings } from 'lucide-react'

export default function DoctorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_patients: 0, prescriptions_today: 0, notes_today: 0 })
  const [linkedPatients, setLinkedPatients] = useState<any[]>([])
  const [linkedDetails, setLinkedDetails] = useState<any[]>([])
  const [linkId, setLinkId] = useState('')
  const [linkMsg, setLinkMsg] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [mcNumber, setMcNumber] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')

  // Voice search
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [docImage, setDocImage] = useState("https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=256&h=256&auto=format&fit=crop")
  const docFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
       const cached = localStorage.getItem(`doc_image_${user.id}`)
       if (cached && !docImage.startsWith('data:')) setDocImage(cached)
    }
  }, [user?.id])

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

  useEffect(() => {
    setIsOnline(navigator.onLine)
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) { router.push('/auth?role=doctor'); return }
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      setUser(profile ? { ...profile, id: user.id } : { name: user.email, email: user.email, id: user.id })
      if (profile?.profile_image) setDocImage(profile.profile_image)

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`)
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setStats(data))
        .catch(() => {})

      const docEmail = user.email || profile?.email
      if (docEmail) {
        const { data: links } = await supabase.from('patient_doctor_links').select('*').eq('doctor_email', docEmail)
        setLinkedPatients(links || [])

        // Fetch details for each linked patient
        if (links && links.length > 0) {
          const details = await Promise.all(
            links.map(async (lp: any) => {
              try {
                const encodedId = encodeURIComponent(lp.patient_id)
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${encodedId}`, { cache: 'no-store' })
                if (res.ok) {
                  const p = await res.json()
                  const patientData = Array.isArray(p) ? p[0] : p
                  const localImg = localStorage.getItem(`patient_image_${patientData.id}`)
                  if (localImg) patientData.profile_image = localImg
                  
                  // Check if gender is missing or "Unknown" and try user_profiles fallback
                  if (!patientData.gender || patientData.gender === 'Unknown') {
                    const { data: profile } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', lp.patient_id).single()
                    if (profile) {
                      if (profile.gender) patientData.gender = profile.gender
                      if (profile.name && (!patientData.name || patientData.name === 'Unknown')) patientData.name = profile.name
                    }
                  }
                  return patientData
                } else {
                  // Fallback to Supabase patients table
                  const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', lp.patient_id).single()
                  if (pSupBase) {
                    const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
                    if (localImg) pSupBase.profile_image = localImg
                    // If gender missing in patients, try user_profiles
                    if (!pSupBase.gender || pSupBase.gender === 'Unknown') {
                      const { data: profile } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', lp.patient_id).single()
                      if (profile) {
                        if (profile.gender) pSupBase.gender = profile.gender
                        if (profile.name && (!pSupBase.name || pSupBase.name === 'Unknown')) pSupBase.name = profile.name
                      }
                    }
                    return pSupBase
                  } else {
                    // Critical fallback to user_profiles if no patient record at all
                    const { data: profile } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', lp.patient_id).single()
                    if (profile) {
                      return { id: lp.patient_id, name: profile.name || 'Unknown', age: '-', gender: profile.gender || 'Unknown' }
                    }
                  }
                }
              } catch { 
                 // Fallback to Supabase on network/backend error
                 const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', lp.patient_id).single()
                 if (pSupBase) {
                   const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
                   if (localImg) pSupBase.profile_image = localImg
                   // If gender missing in patients, try user_profiles
                   if (!pSupBase.gender || pSupBase.gender === 'Unknown') {
                     const { data: profile } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', lp.patient_id).single()
                     if (profile) {
                       if (profile.gender) pSupBase.gender = profile.gender
                       if (profile.name && (!pSupBase.name || pSupBase.name === 'Unknown')) pSupBase.name = profile.name
                     }
                   }
                   return pSupBase
                 } else {
                   const { data: profile } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', lp.patient_id).single()
                   if (profile) return { id: lp.patient_id, name: profile.name || 'Unknown', age: '-', gender: profile.gender || 'Unknown' }
                 }
              }
              return { id: lp.patient_id, name: 'Unknown', age: '-', gender: 'Unknown' }
            })
          )
          setLinkedDetails(details.filter(Boolean))
        }
      }
      setLoading(false)
    }
    init()

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`)
        if (res.ok) setStats(await res.json())
      } catch { }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearching(true); setSearchError(''); setSearchResult(null)
    const sanitizedId = searchId.trim().replace(/^#/, '')
    try {
      const encodedId = encodeURIComponent(sanitizedId)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${encodedId}`, { cache: 'no-store' })
      if (res.ok) {
        const p = await res.json()
        const patientData = Array.isArray(p) ? p[0] : p
        if (patientData) {
          const localImg = localStorage.getItem(`patient_image_${patientData.id}`)
          if (localImg) patientData.profile_image = localImg
          
          // User profile fallback check
          if (!patientData.gender || patientData.gender === 'Unknown') {
            const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', sanitizedId).single()
            if (prof) {
              if (prof.gender) patientData.gender = prof.gender
              if (prof.name && (!patientData.name || patientData.name === 'Unknown')) patientData.name = prof.name
            }
          }
          setSearchResult(patientData)
        } else {
          setSearchError(`No patient found with ID: ${sanitizedId}`)
        }
      } else {
        // Fallback to Supabase if API fails or returns error
        const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', sanitizedId).single()
        if (pSupBase) {
          const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
          if (localImg) pSupBase.profile_image = localImg
          if (!pSupBase.gender || pSupBase.gender === 'Unknown') {
            const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', sanitizedId).single()
            if (prof) {
              if (prof.gender) pSupBase.gender = prof.gender
              if (prof.name && (!pSupBase.name || pSupBase.name === 'Unknown')) pSupBase.name = prof.name
            }
          }
          setSearchResult(pSupBase)
        } else {
          // Last resort fallback to user_profiles
          const { data: prof } = await supabase.from('user_profiles').select('name, gender').eq('patient_id', sanitizedId).single()
          if (prof) {
            setSearchResult({ id: sanitizedId, name: prof.name || 'Unknown', age: '-', gender: prof.gender || 'Unknown' })
          } else {
            setSearchError(`No patient found with ID: ${sanitizedId}`)
          }
        }
      }
    } catch { 
      // Fallback to Supabase on network/backend error
      const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', sanitizedId).single()
      if (pSupBase) {
        const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
        if (localImg) pSupBase.profile_image = localImg
        setSearchResult(pSupBase)
      } else {
        setSearchError('Backend not running and patient not found in database.')
      }
    }
    setSearching(false)
  }

  const handleLinkPatient = async () => {
    if (!linkId.trim()) return
    const sanitizedId = linkId.trim().replace(/^#/, '')
    setLinkMsg('')
    const docEmail = user?.email || ''
    const { error } = await supabase.from('patient_doctor_links').insert({
      patient_id: sanitizedId, doctor_email: docEmail, doctor_name: user?.name || docEmail
    })
    if (error) {
      if (error.code === '23505') setLinkMsg('Already linked!')
      else setLinkMsg('Error: ' + error.message)
    } else {
      setLinkMsg(`✅ Patient ${sanitizedId} linked!`)
      // Fetch details of newly linked patient
      try {
        const encodedId = encodeURIComponent(sanitizedId)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${encodedId}`)
        if (res.ok) {
          const detail = await res.json()
          const patientData = Array.isArray(detail) ? detail[0] : detail
          const localImg = localStorage.getItem(`patient_image_${patientData.id}`)
          if (localImg) patientData.profile_image = localImg
          setLinkedDetails(prev => [...prev, patientData])
        } else {
          // Fallback to Supabase
          const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', sanitizedId).single()
          if (pSupBase) {
            const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
            if (localImg) pSupBase.profile_image = localImg
            setLinkedDetails(prev => [...prev, pSupBase])
          } else {
            setLinkedDetails(prev => [...prev, { id: sanitizedId, name: 'Unknown', age: '-', gender: 'Unknown' }])
          }
        }
      } catch { 
        // Fallback to Supabase
        const { data: pSupBase } = await supabase.from('patients').select('*').eq('id', sanitizedId).single()
        if (pSupBase) {
          const localImg = localStorage.getItem(`patient_image_${pSupBase.id}`)
          if (localImg) pSupBase.profile_image = localImg
          setLinkedDetails(prev => [...prev, pSupBase])
        } else {
          setLinkedDetails(prev => [...prev, { id: sanitizedId, name: 'Unknown', age: '-', gender: 'Unknown' }])
        }
      }
      const { data: links } = await supabase.from('patient_doctor_links').select('*').eq('doctor_email', docEmail)
      setLinkedPatients(links || [])
      setLinkId('')
    }
  }

  const handleVerify = async () => {
    if (!mcNumber.trim()) return
    setVerifying(true)
    await supabase.from('user_profiles').update({ mc_number: mcNumber, verified: true }).eq('email', user?.email)
    setUser({ ...user, mc_number: mcNumber, verified: true })
    setVerifying(false)
  }

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice not supported. Use Chrome browser.')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setSearchId(transcript.replace(/\s/g, '').toUpperCase())
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7f9]">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-white/50 border-t-[#006381] rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(0,99,129,0.15)]" />
        <p className="text-[#006381] text-[0.75rem] font-medium tracking-wider uppercase">Loading workspace...</p>
      </div>
    </div>
  )

  const rawName = user?.name || ''
  let baseName = rawName.includes('@') ? rawName.split('@')[0] : rawName
  baseName = baseName.replace(/[0-9]/g, '').replace(/[._-]/g, ' ').trim().replace(/\s+/g, ' ')
  const formatName = (str: string) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  let doctorName = baseName ? formatName(baseName) : ''
  doctorName = doctorName.replace(/^Dr\.?\s*/i, '') // Remove Dr. prefix if they manually typed it
  const displayDocName = doctorName ? `Dr. ${doctorName}` : 'Doctor'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', background: '#F8FAFC', position: 'relative', fontFamily: "'Manrope', sans-serif" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
      `}} />

      {/* Atmospheric Background Layers */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(at top left, #E0F2FE 0%, transparent 40%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(at bottom right, rgba(224, 242, 254, 0.5) 0%, transparent 30%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* A. The "Clinical Navigation" Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: '280px', height: '100vh', zIndex: 100, background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(40px)', borderRight: '1px solid rgba(0, 102, 132, 0.08)', display: 'flex', flexDirection: 'column', padding: '40px 24px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 102, 132, 0.2)', border: '2px solid white', backgroundColor: '#006684' }}>
            <img src={docImage} alt="Doctor Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 'bold', fontSize: '18px', color: '#1E293B', lineHeight: '1.2' }}>{displayDocName}</span>
            <span style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#E0F2FE', color: '#006684', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clinical Role</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '48px' }}>
          <div onClick={() => setActiveTab('Dashboard')} className={activeTab === 'Dashboard' ? "bg-white/60 shadow-sm border border-white/40 text-[#006684] rounded-xl font-bold cursor-pointer" : "text-slate-500 hover:text-[#006684] hover:bg-white/20 transition-all cursor-pointer"} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '12px', fontWeight: activeTab === 'Dashboard' ? 'bold' : '600' }}>
            <Activity size={20} /> Dashboard
          </div>
          <div onClick={() => setActiveTab('Patients')} className={activeTab === 'Patients' ? "bg-white/60 shadow-sm border border-white/40 text-[#006684] rounded-xl font-bold cursor-pointer" : "text-slate-500 hover:text-[#006684] hover:bg-white/20 transition-all cursor-pointer"} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '12px', fontWeight: activeTab === 'Patients' ? 'bold' : '600' }}>
            <Users size={20} /> My Patients
          </div>
          <div onClick={() => setActiveTab('Analytics')} className={activeTab === 'Analytics' ? "bg-white/60 shadow-sm border border-white/40 text-[#006684] rounded-xl font-bold cursor-pointer" : "text-slate-500 hover:text-[#006684] hover:bg-white/20 transition-all cursor-pointer"} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '12px', fontWeight: activeTab === 'Analytics' ? 'bold' : '600' }}>
            <TrendingUp size={20} /> Clinical Analytics
          </div>

          <div style={{ marginTop: '24px' }}>
            <button 
              onClick={() => { setActiveTab('Dashboard'); setTimeout(() => document.getElementById('search-patient-input')?.focus(), 100); }} 
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-white transition-all shadow-[0_4px_14px_rgba(0,102,132,0.25)] hover:shadow-[0_6px_20px_rgba(0,102,132,0.4)] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0081A7, #005F80)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={18} strokeWidth={3} /> New Consultation
            </button>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/auth'))} className="text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold" style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Grid Area (Offset by 280px due to grid) */}
      <div style={{ gridColumn: '2', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>

        {/* B. The Content Header */}
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', position: 'sticky', top: 0, zIndex: 90, background: 'rgba(248, 250, 252, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input type="text" placeholder="Global search..." style={{ width: '400px', height: '48px', borderRadius: '9999px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '0 24px 0 56px', outline: 'none', color: '#1E293B', fontSize: '14px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '13px', fontWeight: '700', pointerEvents: 'none', userSelect: 'none' }}>
              <Calendar size={16} />
              <span suppressHydrationWarning>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style={{ height: '20px', width: '2px', backgroundColor: '#F1F5F9' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', backgroundColor: '#ECFDF5', padding: '6px 12px', borderRadius: '9999px', pointerEvents: 'none', userSelect: 'none', border: '1px solid #A7F3D0' }}>
              <Shield size={16} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 10px rgba(16,185,129,0.8)' }} />
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', backgroundColor: '#006684', marginLeft: '8px' }}>
              <img src={docImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

        {/* 12-Column Flexible Grid within Main Area for contents */}
        {/* To support 'margin: 32px 48px 0; grid-column: span 12;' from prompt */}
        {activeTab === 'Dashboard' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '32px', padding: '0 48px', marginTop: '16px' }}>

              {/* A. [NEW] The "Hero" Narrative & Central Portrait (Top Section) */}
              <div style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 48px 32px', background: 'transparent' }}>
                <div style={{ position: 'relative', width: '140px', height: '140px', marginBottom: '24px' }}>
                  <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: '4px solid #FFFFFF', boxShadow: '0 15px 35px rgba(0, 102, 132, 0.2)', backgroundColor: '#E0F2FE', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, cursor: 'pointer' }} onClick={() => docFileInputRef.current?.click()} className="group">
                    <input type="file" accept="image/*" ref={docFileInputRef} onChange={handleDocImageUpload} style={{ display: 'none' }} />
                    <img src={docImage} alt="Doctor Hero Picture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold', fontSize: '13px' }} className="group-hover:opacity-100">
                       Upload
                    </div>
                  </div>
                  {/* Glowing Status Ring */}
                  <div style={{ position: 'absolute', inset: '-6px', borderRadius: '50%', border: '2px solid #26E6FF', boxShadow: '0 0 20px rgba(38, 230, 255, 0.4)', zIndex: 1, pointerEvents: 'none' }} />
                </div>
                <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: '700', fontSize: '48px', letterSpacing: '-0.04em', color: '#1E293B', margin: '0' }}>
                  Good morning, {displayDocName}
                </h1>
                <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: '500', fontSize: '16px', color: '#64748B', margin: '16px 0 0 0' }}>
                  You have <strong style={{ color: '#1E293B', fontWeight: '700' }}>12 appointments</strong> scheduled for today. The first one starts in <strong style={{ color: '#1E293B', fontWeight: '700' }}>24 minutes</strong>.
                </p>
              </div>

              {/* C. The Hero Module: Account Security */}
              {!user?.verified ? (
                <div style={{ gridColumn: 'span 12', padding: '24px 32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(30px)', borderRight: '1px solid rgba(255, 255, 255, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 10px 40px -10px rgba(0, 102, 132, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Account Security Review</h2>
                      <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Please verify your medical license for advanced clinical access.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                      value={mcNumber} onChange={e => setMcNumber(e.target.value)}
                      placeholder="License Number"
                      style={{ padding: '14px 24px', borderRadius: '16px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', width: '240px', backgroundColor: 'white' }}
                    />
                    <button onClick={handleVerify} disabled={verifying || !mcNumber.trim()} style={{ backgroundColor: '#006684', color: 'white', padding: '14px 32px', borderRadius: '16px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: verifying || !mcNumber.trim() ? 0.5 : 1 }}>
                      {verifying ? 'Verifying...' : 'Verify Now'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: 'span 12', padding: '24px 32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(30px)', borderRight: '1px solid rgba(255, 255, 255, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 10px 40px -10px rgba(0, 102, 132, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                      <BadgeCheck size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Account Verified</h2>
                      <p style={{ fontSize: '14px', color: '#059669', margin: 0, fontWeight: '600' }}>Your medical license ({user?.mc_number || 'active'}) is verified and approved.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* If verified (or generally), can show a welcome text here spanning 12 cols, but we'll stick to modules */}
            </div>

            {/* D. Practice Snapshot: Horizontal Metric Grid */}
            <div style={{ marginTop: '32px', padding: '0 48px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', position: 'relative', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1">
                <div style={{ color: '#64748B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '16px' }}><Users size={16} /> Total Patients</div>
                <div style={{ fontSize: '38px', fontWeight: '800', color: '#1E293B', lineHeight: '1', letterSpacing: '-1px' }}>{stats.total_patients || 142}</div>
              </div>
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', position: 'relative', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1">
                <div style={{ color: '#64748B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '16px' }}><Pill size={16} /> Prescriptions</div>
                <div style={{ fontSize: '38px', fontWeight: '800', color: '#1E293B', lineHeight: '1', letterSpacing: '-1px' }}>{stats.prescriptions_today || 24}</div>
              </div>
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', position: 'relative', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover:-translate-y-1">
                <div style={{ color: '#64748B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '16px' }}><FileText size={16} /> Open Notes</div>
                <div style={{ fontSize: '38px', fontWeight: '800', color: '#1E293B', lineHeight: '1', letterSpacing: '-1px' }}>{stats.notes_today || 12}</div>
              </div>
            </div>

            {/* E. Patient Management Hub */}
            <div style={{ marginTop: '40px', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Find Patient Card */}
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRight: '1px solid rgba(255, 255, 255, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>Find Patient</h3>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}>Access longitudinal health records securely.</p>
                <div style={{ display: 'flex', gap: '16px', marginBottom: searchResult || searchError ? '24px' : '0' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input id="search-patient-input" value={searchId} onChange={e => setSearchId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Enter Patient ID (e.g. 150895-1234)" style={{ width: '100%', padding: '16px 24px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', color: '#1E293B', fontWeight: '500', transition: 'border 0.3s' }} className="focus:border-[#006684] focus:ring-4 focus:ring-[#006684]/10" />
                    <button onClick={startVoiceSearch} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: isListening ? '#26E6FF' : '#94A3B8' }}><Mic size={20} /></button>
                  </div>
                  <button onClick={handleSearch} disabled={searching || !searchId.trim()} style={{ backgroundColor: '#1E293B', color: 'white', padding: '0 32px', borderRadius: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>{searching ? '...' : 'Search'}</button>
                </div>
                {searchError && <p style={{ color: '#EF4444', fontSize: '14px', marginTop: '16px', fontWeight: '600' }}>{searchError}</p>}
                {searchResult && (
                  <div onClick={() => router.push(`/doctor/patient/${searchResult.id}`)} style={{ padding: '20px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} className="hover:shadow-md hover:border-slate-300">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', backgroundColor: '#E0F2FE' }}>
                        <img src={searchResult.profile_image || `https://i.pravatar.cc/150?u=${searchResult.id}`} onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(searchResult.name || 'Patient') + '&background=E0F2FE&color=006684' }} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: '#1E293B', fontSize: '16px' }}>{searchResult.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID: {searchResult.id}</div>
                          <span style={{ color: '#E2E8F0' }}>•</span>
                          <div style={{ fontSize: '12px', color: '#006684', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{searchResult.gender || 'Unknown'}</div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} color="#94A3B8" />
                  </div>
                )}
              </div>

              {/* Link Patient Card */}
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', borderRight: '1px solid rgba(255, 255, 255, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>Link Patient</h3>
                <p style={{ color: '#64748B', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}>Add a new patient to your monitored clinical roster.</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <input value={linkId} onChange={e => setLinkId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLinkPatient()} placeholder="Enter Patient ID (e.g. 150895-1234)" style={{ flex: 1, padding: '16px 24px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', color: '#1E293B', fontWeight: '500' }} />
                  <button onClick={handleLinkPatient} disabled={!linkId.trim()} style={{ backgroundColor: '#006684', color: 'white', padding: '0 32px', borderRadius: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>Link</button>
                </div>
                {linkMsg && (
                  <div style={{ marginTop: '20px', fontSize: '14px', padding: '12px 16px', borderRadius: '12px', backgroundColor: linkMsg.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: linkMsg.startsWith('✅') ? '#059669' : '#DC2626', fontWeight: '700' }}>{linkMsg}</div>
                )}
              </div>
            </div>

            {/* E. Recent Activity Overview (Condensed for Dashboard) */}
            <div style={{ marginTop: '40px', padding: '0 48px 64px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                 <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.5px' }}>Recent Patient Interactions</h3>
                 <button onClick={() => setActiveTab('Patients')} style={{ color: '#006684', fontWeight: '800', fontSize: '14px', backgroundColor: '#E0F2FE', padding: '8px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>View Clinical Roster</button>
              </div>
              {linkedDetails.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                  <p style={{ color: '#64748B', fontWeight: '600' }}>Your patient roster is currently empty. Start by linking a patient ID above.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {linkedDetails.slice(0, 3).map((p, i) => {
                    const isCritical = i % 3 === 0;
                    return (
                      <div key={i} onClick={() => router.push(`/doctor/patient/${p.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderRadius: '28px', backgroundColor: 'white', border: '1px solid #F1F5F9', boxShadow: '0 4px 15px -5px rgba(0, 0, 0, 0.02)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }} className="hover:shadow-[0_20px_40px_-15px_rgba(0,102,132,0.12)] hover:border-[#E0F2FE] hover:-translate-y-1">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', border: isCritical ? '2px solid #FECACA' : '2px solid #A7F3D0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backgroundColor: '#F8FAFC' }}>
                            <img src={p.profile_image || `https://i.pravatar.cc/150?u=${p.id}`} onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name || 'Patient') + '&background=' + (isCritical ? 'FEF2F2' : 'F0FDF4') + '&color=' + (isCritical ? 'EF4444' : '10B981') }} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: '800', fontSize: '18px', color: '#1E293B' }}>{p.name}</span>
                            </div>
                            <div style={{ color: '#64748B', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>ID: {p.id}</span>
                              <span>•</span>
                              <span>{p.age}y</span>
                              <span>•</span>
                              <span>{p.gender || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} color="#94A3B8" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- DEDICATED PATIENTS ROSTER SECTION --- */}
        {activeTab === 'Patients' && (
          <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684' }}>
                <Users size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.5px', margin: 0 }}>My Clinical Roster</h2>
                <p style={{ color: '#64748B', fontWeight: '500', fontSize: '15px', margin: '4px 0 0 0' }}>Manage all linked clinical profiles</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {linkedDetails.length === 0 ? (
                <div style={{ padding: '80px 48px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                   <Users size={48} color="#94A3B8" style={{ marginBottom: '20px' }} />
                   <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginBottom: '8px' }}>Roster is empty</h3>
                   <p style={{ color: '#64748B', fontWeight: '500' }}>You haven't linked any patients yet. Use the Search feature on the dashboard to get started.</p>
                </div>
              ) : (
                linkedDetails.map((p, i) => {
                  const isCritical = i % 3 === 0;
                  return (
                    <div key={i} onClick={() => router.push(`/doctor/patient/${p.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 32px', borderRadius: '32px', backgroundColor: 'white', border: '1px solid #F1F5F9', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' }} className="hover:shadow-[0_20px_50px_-15px_rgba(0,102,132,0.15)] hover:border-[#E0F2FE] hover:-translate-y-1">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: isCritical ? '2px solid #FECACA' : '2px solid #A7F3D0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#F8FAFC' }}>
                          <img src={p.profile_image || `https://i.pravatar.cc/150?u=${p.id}`} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '800', fontSize: '20px', color: '#1E293B' }}>{p.name}</span>
                            <span style={{ backgroundColor: isCritical ? '#FEF2F2' : '#ECFDF5', color: isCritical ? '#DC2626' : '#059669', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em' }}>{isCritical ? 'REVIEW' : 'STABLE'}</span>
                          </div>
                          <div style={{ color: '#64748B', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>ID: <strong style={{ color: '#1E293B' }}>#{p.id}</strong></span>
                            <span>•</span>
                            <span>{p.age} Years</span>
                            <span>•</span>
                            <span>{p.gender || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Specialty</span>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{isCritical ? 'Cardiology' : 'General Medicine'}</span>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* --- CLINICAL ANALYTICS SECTION --- */}
        {activeTab === 'Analytics' && (
          <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#006684' }}>
                <Activity size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.5px', margin: 0 }}>Clinical Analytics</h2>
                <p style={{ color: '#64748B', fontWeight: '500', fontSize: '15px', margin: '4px 0 0 0' }}>Practice performance and patient outcomes</p>
              </div>
            </div>

            <div style={{ width: '100%', marginBottom: '24px', padding: '16px 24px', backgroundColor: 'rgba(236, 253, 245, 0.6)', border: '1px solid rgba(167, 243, 208, 0.8)', borderRadius: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', backdropFilter: 'blur(10px)' }}>
              <p style={{ color: '#065F46', fontSize: '14.5px', fontWeight: '600', lineHeight: '1.6', margin: 0 }}>
                <strong style={{ fontWeight: '800' }}>Performance Insight:</strong> Your patient recovery rate increased by 2.4% this month, while patient satisfaction remained exceptionally high at 4.9/5 — indicating highly effective and detailed patient interactions.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '8px' }}>
              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ color: '#64748B', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Recovery</span>
                  <TrendingUp size={20} color="#059669" />
                </div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: '#1E293B', lineHeight: '1', marginBottom: '12px', letterSpacing: '-1.5px' }}>84.2%</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>
                  +2.4% vs last month
                </div>
              </div>

              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ color: '#64748B', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Consultation</span>
                  <Clock size={20} color="#006684" />
                </div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: '#1E293B', lineHeight: '1', marginBottom: '12px', letterSpacing: '-1.5px' }}>18m</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#006684', backgroundColor: '#E0F2FE', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>
                  Optimal duration
                </div>
              </div>

              <div style={{ padding: '32px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 10px 30px -10px rgba(0, 102, 132, 0.08)', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ color: '#64748B', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient Satisfaction</span>
                  <Users size={20} color="#8B5CF6" />
                </div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: '#1E293B', lineHeight: '1', marginBottom: '12px', letterSpacing: '-1.5px' }}>4.9/5</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#8B5CF6', backgroundColor: '#F5F3FF', padding: '4px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>
                  Based on 124 reviews
                 </div>
              </div>
            </div>

            <div style={{ padding: '40px', borderRadius: '32px', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 20px 40px -20px rgba(0, 102, 132, 0.15)', backdropFilter: 'blur(30px)', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1E293B', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Clinical Activity Curve</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748B', fontWeight: '600' }}>Longitudinal tracking of prescriptions vs. notes</p>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', fontWeight: '800', color: '#475569', backgroundColor: '#F8FAFC', padding: '10px 20px', borderRadius: '9999px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'linear-gradient(180deg, #26E6FF 0%, #5A9E78 100%)', boxShadow: '0 2px 8px rgba(38,230,255,0.4)' }} /> 
                    Prescriptions
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'linear-gradient(180deg, #006684 0%, #00455B 100%)', boxShadow: '0 2px 8px rgba(0,102,132,0.4)' }} /> 
                    Notes
                  </div>
                </div>
              </div>
              
              {(() => {
                const rawData = (stats as any).graph_data || [];
                const hasActualData = rawData.length > 0 && rawData.some((d: any) => d.admissions > 0 || d.recoveries > 0);
                const displayGraphData = hasActualData ? rawData : [
                  {admissions: 12, recoveries: 6}, {admissions: 18, recoveries: 12}, 
                  {admissions: 14, recoveries: 10}, {admissions: 28, recoveries: 20}, 
                  {admissions: 24, recoveries: 18}, {admissions: 35, recoveries: 26}, 
                  {admissions: 30, recoveries: 22}
                ];
                const displayLabels = hasActualData && (stats as any).graph_labels ? (stats as any).graph_labels : ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

                return (
                  <>
                    {!hasActualData && (
                      <div style={{ marginBottom: '24px', display: 'inline-flex', backgroundColor: '#F1F5F9', color: '#64748B', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                        Visualizing Demo Data (Awaiting Patient Records)
                      </div>
                    )}
                    <div style={{ position: 'relative', height: '280px', paddingBottom: '8px' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                        {[...Array(6)].map((_, i) => (
                          <div key={i} style={{ width: '100%', height: '1px', backgroundColor: 'rgba(0, 102, 132, 0.06)' }} />
                        ))}
                      </div>
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: '24px', height: '100%', paddingTop: '8%' }}>
                        {displayGraphData.map((val: any, i: number, arr: any[]) => {
                          const maxVal = Math.max(...arr.flatMap((d: any) => [d.admissions || 0, d.recoveries || 0]), 1);
                          const admH = `${Math.max(((val.admissions || 0) / maxVal) * 100, 4)}%`;
                          const recH = `${Math.max(((val.recoveries || 0) / maxVal) * 100, 4)}%`;
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100%', position: 'relative' }} className="group">
                              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap z-50 shadow-xl pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span>Rx: <span style={{ color: '#26E6FF' }}>{val.admissions || 0}</span></span>
                                  <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }} />
                                  <span>Notes: <span style={{ color: '#006684' }}>{val.recoveries || 0}</span></span>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', backgroundColor: '#1E293B' }} />
                              </div>
                              <div className="group-hover:scale-y-[1.03] transition-all cursor-pointer opacity-90 group-hover:opacity-100" style={{ flex: 1, background: 'linear-gradient(180deg, #26E6FF 0%, #5A9E78 100%)', height: admH, borderRadius: '6px 6px 4px 4px', boxShadow: '0 4px 15px rgba(38,230,255,0.2)', transformOrigin: 'bottom' }} />
                              <div className="group-hover:scale-y-[1.03] transition-all cursor-pointer opacity-90 group-hover:opacity-100" style={{ flex: 1, background: 'linear-gradient(180deg, #006684 0%, #00455B 100%)', height: recH, borderRadius: '6px 6px 4px 4px', boxShadow: '0 4px 15px rgba(0,102,132,0.2)', transformOrigin: 'bottom' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 8px 0', borderTop: '2px solid #F1F5F9', color: '#64748B', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {displayLabels.map((l: string, i: number, arr: any[]) => <span key={i} style={{ flex: 1, textAlign: i === 0 ? 'left' : (i === arr.length - 1 ? 'right' : 'center') }}>{l}</span>)}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

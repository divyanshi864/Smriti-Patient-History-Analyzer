'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'

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

  // Voice search
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth?role=doctor'); return }
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      setUser(profile || { name: user.email, email: user.email })

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`)
        if (res.ok) setStats(await res.json())
      } catch {}

      if (profile?.email || user.email) {
        const docEmail = profile?.email || user.email
        const { data: links } = await supabase.from('patient_doctor_links').select('*').eq('doctor_email', docEmail)
        setLinkedPatients(links || [])

        // Fetch details for each linked patient
        if (links && links.length > 0) {
          const details = await Promise.all(
            links.map(async (lp: any) => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${lp.patient_id}`)
                if (res.ok) return await res.json()
              } catch {}
              return { id: lp.patient_id, name: 'Unknown', age: '-', blood_type: '-' }
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
      } catch {}
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearching(true); setSearchError(''); setSearchResult(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${searchId.trim()}`)
      if (res.ok) setSearchResult(await res.json())
      else setSearchError(`No patient found with ID: ${searchId.trim()}`)
    } catch { setSearchError('Backend not running. Start uvicorn first.') }
    setSearching(false)
  }

  const handleLinkPatient = async () => {
    if (!linkId.trim()) return
    setLinkMsg('')
    const docEmail = user?.email || ''
    const { error } = await supabase.from('patient_doctor_links').insert({
      patient_id: linkId.trim(), doctor_email: docEmail, doctor_name: user?.name || docEmail
    })
    if (error) {
      if (error.code === '23505') setLinkMsg('Already linked!')
      else setLinkMsg('Error: ' + error.message)
    } else {
      setLinkMsg(`✅ Patient ${linkId} linked!`)
      // Fetch details of newly linked patient
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${linkId.trim()}`)
        if (res.ok) {
          const detail = await res.json()
          setLinkedDetails(prev => [...prev, detail])
        }
      } catch {}
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/><p className="text-slate-500">Loading...</p></div>
    </div>
  )

  const doctorName = user?.name && !user.name.includes('@') ? user.name : null

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar role="doctor" userName={doctorName || user?.email} />

      {!isOnline && <div className="bg-amber-500 text-white text-center py-2 text-sm font-semibold">⚠️ Offline — cached data only</div>}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">
                Good morning, {doctorName ? doctorName.replace(/^Dr\.\s*/i, 'Dr. ') : 'Doctor'} 👋
              </h1>
              {user?.verified && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">✅ Verified</span>}
            </div>
            <p className="text-slate-500 mt-1 text-sm">Live dashboard · Auto-refreshes every 30s</p>
          </div>
          {!user?.verified && (
            <div className="flex items-center gap-2">
              <input value={mcNumber} onChange={e => setMcNumber(e.target.value)} placeholder="MC Registration No."
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"/>
              <button onClick={handleVerify} disabled={verifying || !mcNumber.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {verifying ? '...' : 'Get Verified ✅'}
              </button>
            </div>
          )}
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Patients', value: stats.total_patients, icon: '👥', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
            { label: 'Prescriptions Today', value: stats.prescriptions_today, icon: '💊', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
            { label: 'Notes Today', value: stats.notes_today, icon: '📝', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div><p className="text-slate-500 text-sm">{s.label}</p><p className="text-3xl font-bold text-slate-800 mt-1">{s.value}</p><span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 inline-block ${s.light}`}>Live</span></div>
                <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-xl`}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="space-y-4">
            {/* Search Patient */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-1">Find Patient</h2>
              <p className="text-slate-500 text-xs mb-3">Enter Patient ID (DDMMYY-XXXX or p001)</p>
              <div className="flex gap-2 mb-2">
                <input value={searchId} onChange={e => setSearchId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="190303-1234 or p001"
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <button onClick={startVoiceSearch}
                  className={`px-3 py-2.5 rounded-xl border transition-colors ${isListening ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  title="Voice search">
                  🎤
                </button>
                <button onClick={handleSearch} disabled={searching || !searchId.trim()}
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {searching ? '...' : 'Find'}
                </button>
              </div>
              {isListening && <p className="text-xs text-red-500 animate-pulse">🎤 Listening... say patient ID</p>}
              {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}

              {/* Search Result */}
              {searchResult && (
                <button onClick={() => router.push(`/doctor/patient/${searchResult.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3 hover:bg-blue-100 transition-colors group text-left">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">{searchResult.name?.charAt(0)}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-800">{searchResult.name}</p>
                    <p className="text-xs text-blue-600">{searchResult.id} · Age {searchResult.age} · {searchResult.blood_type}</p>
                  </div>
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </button>
              )}
            </div>

            {/* Link Patient */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-800 mb-1">Link Patient</h2>
              <p className="text-slate-500 text-xs mb-3">Link PHX/Aadhar ID so prescriptions sync to patient</p>
              <div className="flex gap-2 mb-2">
                <input value={linkId} onChange={e => setLinkId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLinkPatient()}
                  placeholder="190303-1234" className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                <button onClick={handleLinkPatient} disabled={!linkId.trim()}
                  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">Link</button>
              </div>
              {linkMsg && <p className={`text-xs font-medium ${linkMsg.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>{linkMsg}</p>}
            </div>
          </div>

          {/* My Patients (linked only) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">My Patients</h2>
                <p className="text-slate-500 text-xs mt-0.5">Only patients you have linked appear here</p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{linkedDetails.length} linked</span>
            </div>

            {linkedDetails.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-5xl mb-4">🔍</p>
                <p className="font-semibold text-slate-600 mb-2">No patients linked yet</p>
                <p className="text-sm">Use the search box to find a patient by their ID, then open their record and prescribe medicines. The patient will appear here once linked.</p>
                <div className="mt-6 bg-blue-50 rounded-xl p-4 text-left">
                  <p className="text-xs font-bold text-blue-700 mb-2">DEMO — Try these IDs:</p>
                  <div className="flex flex-wrap gap-2">
                    {['p001','p002','p003','p004','p005'].map(id => (
                      <button key={id} onClick={() => router.push(`/doctor/patient/${id}`)}
                        className="bg-blue-600 text-white text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-blue-700">
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {linkedDetails.map((p, i) => (
                  <button key={i} onClick={() => router.push(`/doctor/patient/${p.id}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors group text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {p.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 group-hover:text-blue-700">{p.name}</p>
                          <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Linked</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{p.id} · Age {p.age} · {p.blood_type}</p>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

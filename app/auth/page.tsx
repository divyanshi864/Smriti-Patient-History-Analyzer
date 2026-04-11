'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COUNTRIES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
]

// Generate patient ID: DDMMYY-XXXX
function generatePatientId(dob: string, aadharLast4: string): string {
  if (!dob || !aadharLast4) return ''
  const date = new Date(dob)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}${mm}${yy}-${aadharLast4}`
}

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role') || 'doctor'
  const isDoctor = role === 'doctor'

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const [countryCode, setCountryCode] = useState('+91')
  const [showPicker, setShowPicker] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [patientStep, setPatientStep] = useState<1 | 2 | 3 | 4>(1)
  const [resendTimer, setResendTimer] = useState(0)
  const [existingPatients, setExistingPatients] = useState<any[]>([])

  // Registration
  const [regName, setRegName] = useState('')
  const [regDob, setRegDob] = useState('')
  const [regAadhar4, setRegAadhar4] = useState('')
  const [regBlood, setRegBlood] = useState('')
  const [regAllergies, setRegAllergies] = useState('')
  const [regMeds, setRegMeds] = useState('')
  const [previewId, setPreviewId] = useState('')

  const fullPhone = `${countryCode}${phone}`
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]

  const startTimer = () => {
    setResendTimer(30)
    const iv = setInterval(() => setResendTimer(p => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 }), 1000)
  }

  const updatePreviewId = (dob: string, a4: string) => {
    const id = generatePatientId(dob, a4)
    setPreviewId(id)
  }

  const handleDoctorSubmit = async () => {
    setLoading(true); setError(''); setMsg('')
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { name, role: 'doctor' } } })
        if (err) throw err
        await supabase.from('user_profiles').insert({ user_id: data.user!.id, name, role: 'doctor', email })
        setMsg('Account created! Please login.'); setMode('login')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        router.push('/doctor')
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleSendOtp = async () => {
    if (!phone) { setError('Enter your phone number'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: fullPhone }) })
      const data = await res.json()
      if (res.ok && data.success) { setPatientStep(2); setMsg('OTP sent! If number not on Twilio trial, use 000000 as demo code.'); startTimer() }
      else throw new Error(data.error || 'Failed to send OTP')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    if (!otp) { setError('Enter the OTP'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: fullPhone, code: otp }) })
      const data = await res.json()
      if (res.ok && data.success) {
        const { data: profiles } = await supabase.from('user_profiles').select('*').eq('email', fullPhone).eq('role', 'patient')
        if (profiles && profiles.length > 0) { setExistingPatients(profiles); setPatientStep(3) }
        else { setExistingPatients([]); setPatientStep(4) }
        setMsg('')
      } else throw new Error(data.error || 'Invalid OTP')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleSelectPatient = (profile: any) => {
    localStorage.setItem('patient_session', JSON.stringify(profile))
    setMsg(`Welcome back, ${profile.name}!`)
    setTimeout(() => router.push('/patient'), 800)
  }

  const handleRegister = async () => {
    if (!regName || !regDob || !regAadhar4 || !regBlood) { setError('Name, Date of Birth, Last 4 Aadhar digits and Blood Group are required'); return }
    if (regAadhar4.length !== 4 || !/^\d{4}$/.test(regAadhar4)) { setError('Enter exactly 4 digits from your Aadhar card'); return }
    setLoading(true); setError('')
    try {
      const pid = generatePatientId(regDob, regAadhar4)
      if (!pid) { setError('Invalid date of birth'); setLoading(false); return }
      const { data: existing } = await supabase.from('user_profiles').select('id').eq('patient_id', pid).single()
      if (existing) { setError(`ID ${pid} already exists. Check your date of birth and Aadhar digits.`); setLoading(false); return }
      const { error: profileErr } = await supabase.from('user_profiles').insert({ name: regName, role: 'patient', email: fullPhone, patient_id: pid })
      if (profileErr) throw profileErr
      const dob = new Date(regDob)
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      const recordText = `Patient: ${regName}. DOB: ${regDob}. Age: ${age}. Blood Group: ${regBlood}. Allergies: ${regAllergies || 'None known'}. Medications: ${regMeds || 'None'}. Phone: ${fullPhone}. Registered via Smriti.`
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pid, name: regName, age, blood_type: regBlood, allergies: regAllergies || 'None known', medications: regMeds || 'None', record_text: recordText })
      }).catch(() => { })
      const session = { name: regName, role: 'patient', email: fullPhone, patient_id: pid, dob: regDob }
      localStorage.setItem('patient_session', JSON.stringify(session))
      setMsg(`Registered! Your Patient ID: ${pid}`)
      setTimeout(() => router.push('/patient'), 1500)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  // ── Theme: Doctor = Sage Garden | Patient = Periwinkle Blue ──
  const T = isDoctor ? {
    lpBg: 'linear-gradient(150deg,#E8F5ED 0%,#D4EDDC 45%,#BDDECE 100%)',
    lpRing: 'rgba(90,158,120,0.25)', accent: '#1A3D2B', sub: '#4A7060',
    feat: '#3A6050', checkStroke: '#5A9E78',
    iconBg: 'linear-gradient(135deg,#5A9E78,#3D7A5A)', dot: '#5A9E78',
    tabsBg: '#D8EDDF', tabOn: '#1A3D2B', tabOff: '#7A9888',
    border: '#C8E0D0', focus: '#5A9E78', ring: 'rgba(90,158,120,0.18)',
    ficon: '#8AB8A0', btnBg: 'linear-gradient(135deg,#5A9E78,#3D7A9A)',
    btnShadow: 'rgba(90,158,120,0.30)', lbl: '#3A6048', txt: '#1A3D2B',
    stepDone: '#5A9E78', stepEmpty: '#C8E0D0', avatar: '#3D7A5A',
    avatarAdd: 'linear-gradient(135deg,#5A9E78,#3D7A5A)',
    link: '#5A9E78', note: '#8AAA98', rightBg: '#F7FBF8',
    previewBg: '#1A3D2B', previewLbl: '#9FE1CB', previewVal: '#E8F5ED',
  } : {
    lpBg: 'linear-gradient(150deg,#E8ECF8 0%,#D8DFF5 45%,#C4CCF0 100%)',
    lpRing: 'rgba(104,120,200,0.25)', accent: '#1E2860', sub: '#4858A0',
    feat: '#3848A0', checkStroke: '#6878C8',
    iconBg: 'linear-gradient(135deg,#6878C8,#9878D0)', dot: '#6878C8',
    tabsBg: '#DDE0F5', tabOn: '#1E2860', tabOff: '#8088B8',
    border: '#CDD0EE', focus: '#6878C8', ring: 'rgba(104,120,200,0.18)',
    ficon: '#9098C8', btnBg: 'linear-gradient(135deg,#6878C8,#9878D0)',
    btnShadow: 'rgba(104,120,200,0.30)', lbl: '#4050A0', txt: '#1E2860',
    stepDone: '#6878C8', stepEmpty: '#CDD0EE', avatar: '#4858B0',
    avatarAdd: 'linear-gradient(135deg,#6878C8,#9878D0)',
    link: '#6878C8', note: '#9098C8', rightBg: '#F8F9FE',
    previewBg: '#1E2860', previewLbl: '#B5D4F4', previewVal: '#E8ECF8',
  }

  const inp = (extra?: object): React.CSSProperties => ({
    width: '100%', padding: '11px 13px', border: `1.5px solid ${T.border}`,
    borderRadius: 11, background: 'rgba(255,255,255,0.9)', fontSize: 13.5,
    color: T.txt, fontFamily: 'inherit', outline: 'none', ...extra,
  })
  const inpIcon: React.CSSProperties = { ...inp(), paddingLeft: 38 }

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = T.focus
    e.target.style.boxShadow = `0 0 0 3px ${T.ring}`
    e.target.style.background = 'white'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = T.border
    e.target.style.boxShadow = 'none'
    e.target.style.background = 'rgba(255,255,255,0.9)'
  }

  return (
    <>
      <style>{`
        
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: 'DM Sans', sans-serif; }
        .auth-root { min-height: 100vh; display: flex; }
        .lp { width: 42%; flex-shrink: 0; display: flex; flex-direction: column; justify-content: center; padding: 48px 44px; position: relative; overflow: hidden; }
        @media (max-width: 860px) { .lp { display: none; } }
        .lp-ring { position: absolute; border-radius: 50%; pointer-events: none; }
        .rp { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 44px; overflow-y: auto; min-height: 100vh; }
        .rp-inner { width: 100%; max-width: 420px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; background:none; border:none; cursor:pointer; font-family:inherit; margin-bottom:28px; padding:0; opacity:0.8; }
        .back-btn:hover { opacity: 1; }
        .c-hdr { display:flex; align-items:center; gap:13px; margin-bottom:22px; }
        .c-icon { width:50px; height:50px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .tabs { display:flex; border-radius:13px; padding:4px; margin-bottom:20px; gap:3px; }
        .tab { flex:1; padding:9px; border:none; border-radius:9px; font-size:13.5px; font-family:inherit; cursor:pointer; transition:all 0.22s; }
        .alert { border-radius:11px; padding:10px 14px; font-size:13px; margin-bottom:14px; line-height:1.5; }
        .alert-err { background:#FEF2F2; border:1px solid #FECACA; color:#B91C1C; }
        .alert-ok  { background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; }
        .alert-warn{ background:#FFFBEB; border:1px solid #FDE68A; color:#92400E; }
        .fwrap { position:relative; }
        .ficon { position:absolute; left:11px; top:50%; transform:translateY(-50%); display:flex; pointer-events:none; }
        .field { margin-bottom:13px; }
        .flabel { display:block; font-size:10.5px; font-weight:500; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px; }
        .step-bar { display:flex; gap:5px; margin-bottom:18px; }
        .sp { height:3px; flex:1; border-radius:2px; }
        .phone-row { display:flex; gap:8px; }
        .cbtn { display:flex; align-items:center; gap:6px; flex-shrink:0; border-radius:11px; padding:0 11px; background:rgba(255,255,255,0.9); cursor:pointer; font-family:inherit; font-size:13px; font-weight:500; height:44px; white-space:nowrap; position:relative; border-width:1.5px; border-style:solid; }
        .cdd { position:absolute; top:calc(100% + 5px); left:0; background:white; border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.12); z-index:200; width:220px; max-height:240px; overflow-y:auto; }
        .copt { display:flex; align-items:center; gap:10px; padding:10px 14px; font-size:13px; cursor:pointer; border:none; background:none; width:100%; text-align:left; font-family:inherit; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
        .col2 { grid-column:1/-1; }
        .pcard { display:flex; align-items:center; gap:13px; padding:13px 15px; border-radius:13px; cursor:pointer; transition:all 0.2s; text-align:left; width:100%; font-family:inherit; margin-bottom:9px; border-width:1.5px; border-style:solid; }
        .pavatar { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-size:17px; font-weight:700; flex-shrink:0; }
        .div-row { display:flex; align-items:center; gap:10px; margin:8px 0; }
        .div-line { flex:1; height:1px; }
        .otp-input { width:100%; padding:13px; border-radius:11px; background:rgba(255,255,255,0.9); font-size:26px; font-weight:700; font-family:inherit; text-align:center; letter-spacing:10px; outline:none; border-width:1.5px; border-style:solid; }
        .id-box { border-radius:13px; padding:13px 16px; text-align:center; margin-bottom:13px; }
        .btn-main { width:100%; padding:12px; border:none; border-radius:12px; color:white; font-size:14px; font-weight:500; font-family:inherit; cursor:pointer; margin-top:4px; letter-spacing:0.2px; transition:all 0.22s; }
        .btn-main:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-main:not(:disabled):hover { transform:translateY(-1.5px); }
        .btn-ghost { width:100%; margin-top:9px; padding:10px; background:transparent; border-radius:11px; font-size:13.5px; cursor:pointer; font-family:inherit; border-width:1.5px; border-style:solid; }
        .btn-lnk { background:none; border:none; cursor:pointer; font-family:inherit; font-size:13px; display:block; width:100%; text-align:center; margin-top:9px; padding:0; opacity:0.7; }
        .btn-lnk:hover { opacity:1; }
        .resend-row { text-align:center; margin-top:8px; font-size:13px; }
        .bnote { text-align:center; font-size:11.5px; margin-top:18px; line-height:1.6; }
      `}</style>

      <div className="auth-root" onClick={() => setShowPicker(false)}>

        {/* LEFT PANEL */}
        <div
          className="lp"
          style={{
            background: T.lpBg,
            boxShadow: 'inset -10px 0 40px rgba(0,0,0,0.05)'
          }}
        >
          <div className="lp-ring" style={{
            width: 360,
            height: 360,
            border: `1.5px solid ${T.lpRing}`,
            top: -120,
            left: -120,
            opacity: 0.6
          }} />

          <div className="lp-ring" style={{
            width: 240,
            height: 240,
            border: `1px solid ${T.lpRing}`,
            bottom: -80,
            right: -80,
            opacity: 0.5
          }} />

          <div className="lp-ring" style={{
            width: 140,
            height: 140,
            background: 'rgba(255,255,255,0.25)',
            top: '40%',
            right: -30,
            filter: 'blur(2px)'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: T.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${T.btnShadow}` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 22,
              fontWeight: 600,
              color: T.accent,
              letterSpacing: '0.5px'
            }}>
              Smriti
            </span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{display: 'inline-flex',alignItems: 'center',gap: 7,background: 'rgba(255,255,255,0.65)',backdropFilter: 'blur(6px)',border: `1px solid ${T.lpRing}`,borderRadius: 20,padding: '4px 13px',fontSize: 11,color: T.accent,fontWeight: 500,marginBottom: 18}}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.dot }} />
              {isDoctor ? 'Doctor Portal' : 'Patient Portal'}
            </div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 34, letterSpacing: '-0.5px', fontWeight: 500, color: T.accent, lineHeight: 1.3, marginBottom: 14 }}>
              {isDoctor ? <>Your patients,<br /><em style={{ fontStyle: 'italic', opacity: 0.7 }}>always</em><br />within reach.</> : <>Your health,<br /><em style={{ fontStyle: 'italic', opacity: 0.7 }}>always</em><br />in your hands.</>}
            </div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.75, maxWidth: 260, marginBottom: 32 }}>
              {isDoctor ? 'Access complete patient histories, AI diagnostics, and treatment workflows — secure and instant.'
                : 'View your medical history, prescriptions, uploaded reports and health timeline anytime.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(isDoctor
                ? ['AI diagnostic suggestions', 'Complete patient history', 'Emergency treatment workflows', 'Secure encrypted records']
                : ['View medical history anytime', 'Access prescriptions & reports', 'OTP-based secure login', 'Aadhar-linked identity']
              ).map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.feat }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={T.checkStroke} strokeWidth="2.5" strokeLinecap="round"><polyline points="2,6 5,9 10,3" /></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="rp" style={{ background: T.rightBg }}>
          <div
            className="rp-inner"
            style={{background: 'linear-gradient(145deg, #ffffff, #f3f7f4)',borderRadius: '22px',padding: '26px',boxShadow: '0 12px 35px rgba(0,0,0,0.08)',border: `1px solid ${T.border}`}}>
            <button className="back-btn" style={{ color: T.sub }} onClick={() => router.push('/')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back to Home
            </button>

            {error && <div className="alert alert-err">{error}</div>}
            {msg && <div className="alert alert-ok">{msg}</div>}

            {/* DOCTOR */}
            {isDoctor && (
              <>
                <div className="c-hdr">
                  <div className="c-icon" >
                    <img src="/stethoscope_50dp_1F1F1F_FILL0_wght400_GRAD0_opsz48.png" alt="Doctor"style={{width: "35px",
                    height: "35px",objectFit: "contain" }}/>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: T.accent }}>Doctor Portal</div>
                    <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Login or create account</div>
                  </div>
                </div>
                <div className="tabs" style={{ background: T.tabsBg }}>
                  {(['login', 'signup'] as const).map(m => (
                    <button key={m} className="tab" onClick={() => setMode(m)}
                      style={{ background: mode === m ? 'white' : 'transparent', color: mode === m ? T.tabOn : T.tabOff, fontWeight: mode === m ? 500 : 400, boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                      {m}
                    </button>
                  ))}
                </div>
                {mode === 'signup' && (
                  <div className="field">
                    <label className="flabel" style={{ color: T.lbl }}>Full Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Sharma" style={inp()} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                )}
                <div className="field">
                  <label className="flabel" style={{ color: T.lbl }}>Email</label>
                  <div className="fwrap">
                    <span className="ficon" style={{ color: T.ficon }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,13 22,4" /></svg></span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@hospital.com" style={inpIcon} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                <div className="field">
                  <label className="flabel" style={{ color: T.lbl }}>Password</label>
                  <div className="fwrap">
                    <span className="ficon" style={{ color: T.ficon }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inpIcon} onFocus={onFocus} onBlur={onBlur} onKeyDown={e => e.key === 'Enter' && handleDoctorSubmit()} />
                  </div>
                </div>
                <button className="btn-main" onClick={handleDoctorSubmit} disabled={loading || !email || !password}
                  style={{ background: T.btnBg, boxShadow: `0 4px 18px ${T.btnShadow}` }}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </>
            )}

            {/* PATIENT STEP 1 */}
            {!isDoctor && patientStep === 1 && (
              <>
                <div className="c-hdr">
                  <div className="c-icon" style={{ background: T.iconBg, boxShadow: `0 4px 16px ${T.btnShadow}` }}>👤</div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: T.accent }}>Patient Portal</div>
                    <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Phone OTP login</div>
                  </div>
                </div>
                <div className="step-bar">
                  <div className="sp" style={{ background: T.stepDone }} /><div className="sp" style={{ background: T.stepEmpty }} />
                </div>
                <div className="field">
                  <label className="flabel" style={{ color: T.lbl }}>Phone Number</label>
                  <div className="phone-row" onClick={e => e.stopPropagation()}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button className="cbtn" style={{ borderColor: T.border, color: T.txt }} onClick={() => setShowPicker(!showPicker)}>
                        <span style={{ fontSize: 18 }}>{selectedCountry.flag}</span>
                        <span>{selectedCountry.code}</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      {showPicker && (
                        <div className="cdd" style={{ border: `1px solid ${T.border}` }}>
                          {COUNTRIES.map(c => (
                            <button key={c.code} className="copt"
                              style={{ background: c.code === countryCode ? T.rightBg : 'none', color: c.code === countryCode ? T.accent : T.txt, fontWeight: c.code === countryCode ? 500 : 400 }}
                              onClick={() => { setCountryCode(c.code); setShowPicker(false) }}>
                              <span style={{ fontSize: 16 }}>{c.flag}</span>
                              <span style={{ flex: 1 }}>{c.name}</span>
                              <span style={{ fontSize: 11, opacity: 0.6 }}>{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input type="tel" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                      placeholder="9876543210" style={{ ...inp(), flex: 1 }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <p style={{ fontSize: 11, color: T.note, marginTop: 5 }}>Enter number without country code</p>
                </div>
                <button className="btn-main" onClick={handleSendOtp} disabled={loading || !phone}
                  style={{ background: T.btnBg, boxShadow: `0 4px 18px ${T.btnShadow}` }}>
                  {loading ? 'Sending OTP...' : '📱 Send OTP via SMS'}
                </button>
              </>
            )}

            {/* PATIENT STEP 2 */}
            {!isDoctor && patientStep === 2 && (
              <>
                <div className="c-hdr">
                  <div className="c-icon" style={{ background: T.iconBg, boxShadow: `0 4px 16px ${T.btnShadow}` }}>👤</div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: T.accent }}>Verify OTP</div>
                    <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Sent to {fullPhone}</div>
                  </div>
                </div>
                <div className="step-bar">
                  <div className="sp" style={{ background: T.stepDone }} /><div className="sp" style={{ background: T.stepDone }} />
                </div>
                <div className="alert alert-warn">💡 If SMS not received, enter <strong>000000</strong> as demo bypass</div>
                <div className="field">
                  <label className="flabel" style={{ color: T.lbl }}>Enter 6-digit OTP</label>
                  <p style={{ fontSize: 12, color: T.note, marginBottom: 8 }}>Sent to {fullPhone}</p>
                  <input className="otp-input" type="number" value={otp} onChange={e => { setOtp(e.target.value); setError('') }}
                    placeholder="123456" style={{ borderColor: T.border, color: T.txt }} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <button className="btn-main" onClick={handleVerifyOtp} disabled={loading || !otp}
                  style={{ background: T.btnBg, boxShadow: `0 4px 18px ${T.btnShadow}` }}>
                  {loading ? 'Verifying...' : '✅ Verify OTP'}
                </button>
                <div className="resend-row" style={{ color: T.note }}>
                  {resendTimer > 0 ? <span>Resend in {resendTimer}s</span>
                    : <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: T.link, textDecoration: 'underline' }} onClick={handleSendOtp}>Resend OTP</button>}
                </div>
                <button className="btn-lnk" style={{ color: T.note }} onClick={() => { setPatientStep(1); setOtp(''); setError('') }}>← Change number</button>
              </>
            )}

            {/* PATIENT STEP 3 - SELECT */}
            {!isDoctor && patientStep === 3 && (
              <>
                <div className="c-hdr">
                  <div className="c-icon" style={{ background: T.iconBg, boxShadow: `0 4px 16px ${T.btnShadow}` }}>👤</div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: T.accent }}>Select Profile</div>
                    <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>{existingPatients.length} profile(s) found</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: T.note, marginBottom: 14 }}>Profiles under <strong style={{ color: T.accent }}>{fullPhone}</strong></p>
                {existingPatients.map((p, i) => (
                  <button key={i} className="pcard" onClick={() => handleSelectPatient(p)}
                    style={{ borderColor: T.border, background: 'rgba(255,255,255,0.8)' }}>
                    <div className="pavatar" style={{ background: T.avatar }}>{p.name?.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: 14, color: T.accent }}>{p.name}</p>
                      <p style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 2, color: T.note }}>{p.patient_id}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.focus} strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
                <div className="div-row">
                  <div className="div-line" style={{ background: T.border }} /><span style={{ fontSize: 11, color: T.note }}>or</span><div className="div-line" style={{ background: T.border }} />
                </div>
                <button className="pcard" onClick={() => { setPatientStep(4); setError('') }}
                  style={{ borderColor: T.focus, background: T.ring }}>
                  <div className="pavatar" style={{ background: T.avatarAdd, fontSize: 20 }}>➕</div>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 14, color: T.accent }}>Add New Patient</p>
                    <p style={{ fontSize: 11, marginTop: 2, color: T.note }}>Register another person</p>
                  </div>
                </button>
                <button className="btn-lnk" style={{ color: T.note }} onClick={() => { setPatientStep(1); setOtp(''); setExistingPatients([]) }}>← Different number</button>
              </>
            )}

            {/* PATIENT STEP 4 - REGISTER WITH AADHAR-BASED ID */}
            {!isDoctor && patientStep === 4 && (
              <>
                <div className="c-hdr">
                  <div className="c-icon" style={{ background: T.iconBg, boxShadow: `0 4px 16px ${T.btnShadow}` }}>img src=C:\Users\Lenovo\Downloads\smriti_FINAL\smriti_FINAL\smriti-final\public</div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: T.accent }}>Register Patient</div>
                    <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Aadhar-based ID</div>
                  </div>
                </div>
                <div className="alert alert-ok">✅ Phone verified! Your ID will be generated from your DOB + Aadhar.</div>
                {previewId && (
                  <div className="id-box" style={{ background: T.previewBg }}>
                    <p style={{ fontSize: 11, color: T.previewLbl, marginBottom: 4 }}>Your Patient ID will be</p>
                    <p style={{ fontSize: 21, fontWeight: 800, fontFamily: 'monospace', color: T.previewVal, letterSpacing: 2 }}>{previewId}</p>
                  </div>
                )}
                <div className="grid2">
                  <div className="field col2">
                    <label className="flabel" style={{ color: T.lbl }}>Full Name *</label>
                    <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Patient full name" style={inp()} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div className="field">
                    <label className="flabel" style={{ color: T.lbl }}>Date of Birth *</label>
                    <input type="date" value={regDob} onChange={e => { setRegDob(e.target.value); updatePreviewId(e.target.value, regAadhar4) }} style={inp()} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div className="field">
                    <label className="flabel" style={{ color: T.lbl }}>Last 4 digits of Aadhar *</label>
                    <input type="number" value={regAadhar4} onChange={e => { const v = e.target.value.slice(0, 4); setRegAadhar4(v); updatePreviewId(regDob, v) }}
                      placeholder="XXXX" maxLength={4} style={{ ...inp(), textAlign: 'center', letterSpacing: 6, fontWeight: 700 }} onFocus={onFocus} onBlur={onBlur} />
                    <p style={{ fontSize: 10.5, color: T.note, marginTop: 3 }}>Only last 4 digits — never stored full Aadhar</p>
                  </div>
                  <div className="field">
                    <label className="flabel" style={{ color: T.lbl }}>Blood Group *</label>
                    <select value={regBlood} onChange={e => setRegBlood(e.target.value)} style={{ ...inp(), appearance: 'none' } as React.CSSProperties} onFocus={onFocus} onBlur={onBlur}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="flabel" style={{ color: T.lbl }}>Known Allergies</label>
                    <input value={regAllergies} onChange={e => setRegAllergies(e.target.value)} placeholder="Penicillin (or blank)" style={inp()} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div className="field col2">
                    <label className="flabel" style={{ color: T.lbl }}>Current Medications</label>
                    <input value={regMeds} onChange={e => setRegMeds(e.target.value)} placeholder="Metformin 500mg (or blank)" style={inp()} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>
                <button className="btn-main" onClick={handleRegister} disabled={loading || !regName || !regDob || !regAadhar4 || !regBlood}
                  style={{ background: T.btnBg, boxShadow: `0 4px 18px ${T.btnShadow}` }}>
                  {loading ? 'Registering...' : `🏥 Register${previewId ? ' as ' + previewId : ''}`}
                </button>
                {existingPatients.length > 0 && <button className="btn-lnk" style={{ color: T.note }} onClick={() => { setPatientStep(3); setError('') }}>← Back to profiles</button>}
              </>
            )}

            <div className="bnote" style={{ color: T.note }}>
              By continuing you agree to our{' '}
              <a href="#" style={{ color: T.link }}>Terms</a> &amp; <a href="#" style={{ color: T.link }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AuthPage() { return <Suspense><AuthForm /></Suspense> }
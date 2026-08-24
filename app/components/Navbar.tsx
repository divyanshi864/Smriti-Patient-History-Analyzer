'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface NavbarProps {
  role: 'doctor' | 'patient'
  userName?: string
}

export default function Navbar({ role, userName }: NavbarProps) {
  const router = useRouter()
  const isDoctor = role === 'doctor'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const doctorColor = '#5A9E78'
  const patientColor = '#6878C8'
  const activeColor = isDoctor ? doctorColor : patientColor

  return (
    <nav 
      className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(90, 158, 120, 0.15)',
        borderTop: `3px solid ${activeColor}`,
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      <div className="flex items-center gap-3">
        {/* Same logo as about and home page */}
        <div 
          className="w-11 h-11 flex items-center justify-center rounded-xl overflow-hidden cursor-pointer shadow-sm transition-transform hover:scale-105" 
          style={{ 
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(90, 158, 120, 0.15)'
          }}
          onClick={() => router.push('/')}
        >
          <img src="/logo2.png" alt="Smriti Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </div>
        <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
          <span className="font-bold text-xl" style={{ color: '#1A3D2B', fontFamily: "'Fraunces', serif" }}>Smriti</span>
          <span 
            className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full"
            style={{
              background: isDoctor ? '#E8F5ED' : '#EEF0FA',
              color: isDoctor ? doctorColor : patientColor,
              border: `1px solid ${isDoctor ? 'rgba(90,158,120,0.2)' : 'rgba(104,120,200,0.2)'}`
            }}
          >
            {isDoctor ? 'Doctor' : 'Patient'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {userName && (
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ background: activeColor }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold hidden md:block" style={{ color: '#1A3D2B' }}>{userName}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-all rounded-full px-5 py-2 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </nav>
  )
}

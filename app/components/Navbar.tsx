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

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-sm">S</span>
        </div>
        <div>
          <span className="font-bold text-slate-800 text-lg">Smriti</span>
          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isDoctor ? 'Doctor' : 'Patient'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {userName && (
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isDoctor ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden md:block">{userName}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-200 px-3 py-2 rounded-xl"
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

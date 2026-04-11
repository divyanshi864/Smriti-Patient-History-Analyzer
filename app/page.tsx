'use client'
import Link from "next/link";
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LandingPage() {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: 'DM Sans', sans-serif; }

        .page {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
          background: #F8F9FE;
        }

        .left-section {
        position: relative;   /* required */
        z-index: 10;
        }

        /* ── NAVBAR — starts after diagonal cut ── */
        .navbar {
       position: absolute;
  top: 0;
  left: 49.9999999999999999999999%;
  right: 0;
  height: 58px;
  padding: 0 44px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  background: linear-gradient(180deg, #F7FBF9 0%, #F4F8F5 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(90,158,120,0.10);
  z-index: 50;
}

        .nav-link {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500; color: #4A7060;
          padding: 7px 15px; border-radius: 20px;
          border: 1.5px solid rgba(90,158,120,0.20);  
          text-decoration: none;
          transition: all 0.22s;
          background: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif;
        }
        .nav-link:hover {
          background: rgba(90,158,120,0.09);
          border-color: rgba(90,158,120,0.28);
          color: #1A3D2B;
        }

        .nav-pill {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500; color: white;
          padding: 7px 18px; border-radius: 20px;
          text-decoration: none;
          background: linear-gradient(135deg, #5A9E78, #3D7A5A);
          box-shadow: 0 2px 10px rgba(90,158,120,0.28);
          transition: all 0.22s;
          font-family: 'DM Sans', sans-serif;
        }
        .nav-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 18px rgba(90,158,120,0.38);
        }

        /* ── DIAGONAL BG ── */
        .diag-bg {
          position: absolute;
          top: 0; left: 0;
          width: 50%; height: 100%;
          background: linear-gradient(160deg, #E8F5ED 0%, #CDEADB 100%);
          clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%);
          z-index: 0;
        }

        /* ── LEFT COLUMN ── */
        .left-col {
          width: 48%;
          padding: 48px 52px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 50px;
          position: relative;
          z-index: 2;
        }

        .logo-wrap { display: flex; align-items: center; gap: 11px; }
        .logo-icon-outer {
          width: 60px; height: 60px;
          border-radius: 14px;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .logo-name {
          font-family: 'Fraunces', serif;
          font-size: 22px; font-weight: 600;
          color: #1A3D2B; letter-spacing: -0.5px;
        }
        .logo-sub {
          font-size: 9.5px; font-weight: 500;
          letter-spacing: 2px; text-transform: uppercase;
          color: #5A9E78; margin-top: 1px;
        }

        .headline-area {
          flex: none;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 0;
          margin-top: 8px;
        }

        .ai-tag {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(90,158,120,0.25);
          border-radius: 20px; padding: 5px 13px;
          font-size: 11px; color: #2A5A3A; font-weight: 500;
          margin-bottom: 20px; width: fit-content;
        }
        .tag-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #5A9E78; animation: blink 2s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .main-headline {
          font-family: 'Fraunces', serif;
          font-size: 36px; font-weight: 500;
          color: #1A3D2B; line-height: 1.25;
          margin-bottom: 16px; letter-spacing: -0.5px;
        }
        .main-headline em { font-style: italic; color: #5A9E78; }

        .tagline {
          font-size: 13.5px; color: #4A7060;
          line-height: 1.75; max-width: 280px;
          margin-bottom: 32px;
        }
        .tagline strong { color: #1A3D2B; font-weight: 500; }

        .feat-list { display: flex; flex-direction: column; gap: 11px; }
        .feat-item {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: #3A6050;
        }
        .feat-check {
          width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
          background: rgba(90,158,120,0.18);
          border: 1px solid rgba(90,158,120,0.30);
          display: flex; align-items: center; justify-content: center;
        }

        /* ── RIGHT COLUMN ── */
        .right-col {
          flex: 1;
          padding: 75px 52px 48px 44px;
          display: flex; flex-direction: column;
          justify-content: center;
          gap: 26px;
          position: relative; z-index: 2;
        }

        .portal-label {
          font-size: 11px; color: #9ca3af;
          letter-spacing: 0.3px; margin-bottom: 2px;
        }

        /* ── CARDS ── */
        .card {
          background: rgba(255,255,255,0.93);
          border-radius: 20px;
          padding: 30px;
          border: 1.5px solid;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          min-height: 120px;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,0.11); }
        .card-doc { border-color: rgba(90,158,120,0.20); }
        .card-doc:hover { border-color: rgba(90,158,120,0.45); }
        .card-pat { border-color: rgba(104,120,200,0.20); }
        .card-pat:hover { border-color: rgba(104,120,200,0.45); }

        .card-inner { display: flex; align-items: flex-start; gap: 16px; }
        .card-icon {
          width: 58px; height: 58px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.25s;
        }
        .card-body { flex: 1; }
        .card-title {
          font-family: 'Fraunces', serif;
          font-size: 20px; font-weight: 600;
          margin-bottom: 6px; line-height: 1.2;
        }
        .card-desc {
          font-size: 14px; color: #6b7280;
          line-height: 1.65; margin-bottom: 14px;
        }
        .card-cta-pill {
          display: inline-flex; align-items: center; gap: 5px;
          border-radius: 9px; padding: 9px 16px;
          font-size: 13.5px; font-weight: 500;
          border: 1.5px solid; transition: all 0.2s;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          background: transparent;
        }

        .pulse-dot {
          position: absolute; top: 14px; right: 14px;
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 0 0 rgba(74,222,128,0.5);
          animation: pulse-anim 2s infinite;
        }
        @keyframes pulse-anim {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }

        @media (max-width: 768px) {
          .navbar { left: 0; }
          .page { flex-direction: column; }
          .diag-bg { width: 100%; height: 45%; clip-path: polygon(0 0,100% 0,100% 80%,0 100%); }
          .left-col { width: 100%; padding: 36px 28px 28px; }
          .right-col { padding: 24px 28px 40px; }
        }
      `}</style>

      <div className="page">
        <div className="diag-bg" />

        {/* ── PREMIUM NAVBAR ── */}
        <nav className="navbar">
          <Link href="/about" className="nav-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            About & Team
          </Link>
        </nav>

        {/* ── LEFT COLUMN ── */}
        <div className="left-col">
          <div className="logo-wrap">
            <div className="logo-icon-outer">
              <img
                src="/logo2.png"
                alt="Smriti Logo"
                style={{
                  width: "70%",
                  height: "70%",
                  objectFit: "cover",
                  transform: "scale(1.4)"
                }}
              />
            </div>
            <div>
              <div className="logo-name">Smriti</div>
              <div className="logo-sub">smart patient insights</div>
            </div>
          </div>

          <div className="headline-area">
            <div className="ai-tag">
              <div className="tag-dot" />
              AI-Powered Healthcare
            </div>
            <div className="main-headline">
              Healthcare<br />intelligence,<br /><em>reimagined.</em>
            </div>
            <div className="tagline">
              AI-powered patient history &amp; emergency treatment recommendation system by{' '}
              <strong>Team Asclepius</strong>
            </div>
            <div className="feat-list">
              {[
                'AI diagnostic suggestions',
                'End-to-end encrypted records',
                'Aadhar-linked patient identity',
                'OTP-based secure login',
              ].map(f => (
                <div className="feat-item" key={f}>
                  <div className="feat-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#5A9E78" strokeWidth="2.5">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="right-col">
          <div className="portal-label">Choose your portal</div>

          {/* Doctor Card */}
          <button
            className="card card-doc"
            onClick={() => router.push('/auth?role=doctor')}
            onMouseEnter={() => setHovered('doctor')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="pulse-dot" />
            <div className="card-inner">
              <div className="card-icon" style={{
                background: hovered === 'doctor' ? 'linear-gradient(135deg,#5A9E78,#3D7A5A)' : 'rgba(90,158,120,0.12)',
                boxShadow: hovered === 'doctor' ? '0 4px 14px rgba(90,158,120,0.30)' : 'none',
                transform: hovered === 'doctor' ? 'scale(1.06)' : 'scale(1)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={hovered === 'doctor' ? 'white' : '#5A9E78'} strokeWidth="2" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="card-body">
                <div className="card-title" style={{ color: '#1A3D2B' }}>Doctor Portal</div>
                <div className="card-desc">
                  Access patient records, AI diagnostics, prescriptions and complete treatment workflow
                </div>
                <div className="card-cta-pill" style={{
                  background: hovered === 'doctor' ? '#EAF5EF' : 'transparent',
                  borderColor: hovered === 'doctor' ? '#C8E0D0' : '#E5E7EB',
                  color: hovered === 'doctor' ? '#2A6040' : '#9ca3af',
                }}>
                  Login as Doctor
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          {/* Patient Card */}
          <button
            className="card card-pat"
            onClick={() => router.push('/auth?role=patient')}
            onMouseEnter={() => setHovered('patient')}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="pulse-dot" />
            <div className="card-inner">
              <div className="card-icon" style={{
                background: hovered === 'patient' ? 'linear-gradient(135deg,#6878C8,#9878D0)' : 'rgba(104,120,200,0.12)',
                boxShadow: hovered === 'patient' ? '0 4px 14px rgba(104,120,200,0.30)' : 'none',
                transform: hovered === 'patient' ? 'scale(1.06)' : 'scale(1)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={hovered === 'patient' ? 'white' : '#6878C8'} strokeWidth="2" strokeLinecap="round">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="card-body">
                <div className="card-title" style={{ color: '#1E2860' }}>Patient Portal</div>
                <div className="card-desc">
                  View your medical history, prescriptions, uploaded reports and health timeline
                </div>
                <div className="card-cta-pill" style={{
                  background: hovered === 'patient' ? '#EEF0FA' : 'transparent',
                  borderColor: hovered === 'patient' ? '#CDD0EE' : '#E5E7EB',
                  color: hovered === 'patient' ? '#1E2860' : '#9ca3af',
                }}>
                  Login as Patient
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>

      </div>
    </>
  )
}
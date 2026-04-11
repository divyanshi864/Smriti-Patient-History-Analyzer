'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const TEAM = [
  {
    name: 'Divyanshi Sahu',
    role: 'Developer',
    avatar: 'DS',
    color: 'linear-gradient(135deg, #5A9E78, #2E7D52)',
    email: 'divyanshi@example.com',
    linkedin: 'https://linkedin.com/in/divyanshi',
    github: 'https://github.com/divyanshi864',
  },
  {
    name: 'Divyansh Pandey',
    role: 'Developer',
    avatar: 'DP',
    color: 'linear-gradient(135deg, #6878C8, #4A5AB0)',
    email: 'divyanshpandey4545@gmail.com',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com/divyanshpandey4545-pixel',
  },
  {
    name: 'Tina Sahu',
    role: 'Developer',
    avatar: 'TS',
    color: 'linear-gradient(135deg, #E58FB0, #C06890)',
    email: 'member3@example.com',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  },
  {
    name: 'Gaureesh Keshri',
    role: 'Developer',
    avatar: 'GK',
    color: 'linear-gradient(135deg, #9878D0, #7058B0)',
    email: 'gaureeshkeshri006@gmail.com',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com/gaureesh007',
  },
  {
    name: 'Suryansh Mishra',
    role: 'Developer',
    avatar: 'SM',
    color: 'linear-gradient(135deg, #3D9A8A, #2A7A6A)',
    email: 'member4@example.com',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  },
  {
    name: 'Rijvan Ahmad',
    role: 'Developer',
    avatar: 'RA',
    color: 'linear-gradient(135deg, #C8856A, #A8654A)',
    email: 'rijvanahmad7861234@gmail.com',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com/Rijvangit',
  },
]

export default function AboutPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        :root {
          --bg-color: #FFF8F3;
          --text-color: #1E293B;
          --text-muted: #64748B;
          
          --nav-bg: rgba(255, 255, 255, 0.5);
          --nav-text: #1E293B;
          
          --card-bg: rgba(255, 255, 255, 0.6);
          --card-border: rgba(255, 255, 255, 0.8);
          --card-shadow: rgba(30, 41, 59, 0.03);
          
          --accent-primary: #1E293B;
          --accent-secondary: #EAE6FF;
          --accent-gradient: linear-gradient(135deg, #1E293B, #64748B);
          
          --icon-bg: #EAE6FF;
          --icon-color: #1E293B;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sway {
          0%   { transform: translate(0,0) rotate(0deg); }
          33%  { transform: translate(30px,-40px) rotate(5deg); }
          66%  { transform: translate(-20px,20px) rotate(-5deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        @keyframes pulseGlow {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.05); }
        }

        html, body {
          height: 100%;
          font-family: 'Outfit', sans-serif;
          background-color: var(--bg-color);
          background-image: 
            radial-gradient(at 0% 0%, rgba(217, 240, 255, 0.5) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(255, 228, 236, 0.5) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(234, 230, 255, 0.5) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(255, 214, 201, 0.5) 0px, transparent 50%);
          background-attachment: fixed;
          color: var(--text-color);
          overflow-x: hidden;
          letter-spacing: 0.02em;
        }

        .page { min-height:100vh; display:flex; flex-direction:column; position:relative; z-index:1; }

        /* ── AMBIENT ── */
        .ambient-light {
          position:fixed; border-radius:50%;
          filter:blur(80px); z-index:0; pointer-events:none;
          animation: sway 20s infinite ease-in-out;
        }
        .light-1 {
          top:-10%; left:-10%; width:50vw; height:50vw; opacity:0.8;
          background: radial-gradient(circle, #D9F0FF 0%, transparent 70%);
        }
        .light-2 {
          bottom:-10%; right:-10%; width:60vw; height:60vw; opacity:0.7;
          background: radial-gradient(circle, #FFE4EC 0%, transparent 70%);
          animation-delay:-5s;
        }
        .light-3 {
          top:30%; left:50%; width:40vw; height:40vw; opacity:0.6;
          background: radial-gradient(circle, #EAE6FF 0%, transparent 70%);
          animation-delay:-10s;
        }

        /* ── NAV ── */
        .nav {
          display:flex; align-items:center; justify-content:space-between;
          padding:0 48px; height:80px; flex-shrink:0;
          background: var(--nav-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          position:sticky; top:0; z-index:50;
          box-shadow: 0 4px 24px rgba(30,41,59,0.02);
          border-bottom: 1px solid var(--card-border);
        }
        .nav-logo { display:flex; align-items:center; gap:16px; cursor:pointer; }
        .logo-box {
          width:46px; height:46px; border-radius:14px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          border:1px solid rgba(255,255,255,0.8);
          display:flex; align-items:center; justify-content:center;
          overflow:hidden; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 12px rgba(30,41,59,0.04);
        }
        .nav-logo:hover .logo-box { transform:scale(1.05) rotate(-3deg); }
        .nav-logo-name {
          font-size:24px; font-weight:800;
          color:var(--nav-text); letter-spacing:-0.5px; line-height:1;
        }
        .nav-logo-sub {
          font-size:10.5px; font-weight:700;
          letter-spacing:1.5px; text-transform:uppercase;
          color:var(--text-muted); margin-top:4px;
        }
        .nav-back {
          display:flex; align-items:center; gap:10px;
          font-size:14.5px; color:var(--text-color); font-weight:700;
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,0.8);
          cursor:pointer; font-family:inherit;
          padding:10px 24px; border-radius:30px;
          transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 12px rgba(30,41,59,0.02);
        }
        .nav-back:hover {
          transform:translateY(-1px) scale(1.03);
          box-shadow:0 8px 24px rgba(30,41,59,0.04);
          background: rgba(255,255,255,0.8);
          border-color: #EAE6FF;
        }

        /* ── HERO ── */
        .hero {
          padding:32px 48px 100px;
          position:relative; overflow:hidden;
          animation:fadeInUp 1s ease-out;
          max-width:1200px; margin:0 auto; width:100%;
          text-align: center;
        }
        .hero-tag {
          display:inline-flex; align-items:center; gap:8px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:30px; padding:8px 20px;
          font-size:13px; color:var(--text-color); font-weight:700;
          margin-bottom:28px; text-transform:uppercase; letter-spacing:1.5px;
          box-shadow: 0 4px 12px rgba(30,41,59,0.03);
        }
        .hero-tag span {
          width:8px; height:8px; border-radius:50%;
          background:var(--accent-primary);
          animation: pulseGlow 2s infinite ease-in-out;
        }
        .hero-title {
          font-size:68px; font-weight:800;
          color:var(--text-color); line-height:1.15;
          margin-bottom:24px; letter-spacing:-1.5px;
        }
        .hero-title .highlight {
          background:var(--accent-gradient);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        }
        .hero-sub {
          font-size:19px; color:var(--text-muted);
          line-height:1.7; max-width:700px; font-weight:400; margin:0 auto;
        }
        .hero-sub strong { color:var(--text-color); font-weight:700; }

        /* ── BODY ── */
        .body { padding:0 48px 100px; max-width:1200px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:64px; }

        .section-header { margin-bottom:24px; animation:fadeInUp 1s ease-out 0.2s backwards; text-align: center; padd}
        .section-title {
          font-size:36px; font-weight:800;
          color:var(--text-color); margin-bottom:16px; letter-spacing:-1px;
          display:flex; align-items:center; justify-content:center; gap:12px;
        }
        .section-sub { font-size:17px; color:var(--text-muted); line-height:1.7; max-width:650px; margin:0 auto; }

        /* ── INFO CARDS ── */
        .info-grid {
          display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
          gap:32px;
          animation:fadeInUp 1s ease-out 0.3s backwards;
        }
        .info-card {
          background:var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius:28px; padding:40px 32px;
          border:1px solid var(--card-border);
          transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 20px var(--card-shadow), inset 0 0 20px rgba(255,255,255,0.4);
          text-align: center;
        }
        .info-card:hover {
          transform:scale(1.03);
          box-shadow:0 16px 40px rgba(30,41,59,0.05), inset 0 0 30px rgba(255, 230, 255, 0.4);
          border-color: var(--accent-secondary);
        }
        .info-card-icon {
          width:68px; height:68px; border-radius:20px;
          background:var(--icon-bg);
          display:flex; align-items:center; justify-content:center;
          margin:0 auto 28px;
          color:var(--icon-color); transition:transform 0.3s;
        }
        .info-card:hover .info-card-icon { transform:scale(1.05) rotate(3deg); }
        .info-card-label {
          font-size:12px; font-weight:800;
          letter-spacing:2px; text-transform:uppercase;
          color:var(--text-muted); margin-bottom:10px;
        }
        .info-card-value { font-size:26px; font-weight:800; color:var(--text-color); margin-bottom:8px; }
        .info-card-sub { font-size:15px; color:var(--text-muted); font-weight:500;}

        /* ── TEAM ── */
        .team-grid {
          display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
          gap:32px;
          animation:fadeInUp 1s ease-out 0.4s backwards;
        }
        .team-card {
          background:var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius:28px; padding:36px 24px;
          border:1px solid var(--card-border);
          box-shadow: 0 4px 20px var(--card-shadow), inset 0 0 20px rgba(255,255,255,0.3);
          transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
          text-align:center; position:relative; overflow:hidden;
        }
        .team-card:before {
           content:""; position:absolute; top:-50%; left:-50%; width:200%; height:200%;
           background:radial-gradient(circle, rgba(234, 230, 255, 0.3) 0%, transparent 60%);
           opacity:0; transition:opacity 0.5s; pointer-events:none; z-index:0;
        }
        .team-card:hover:before { opacity:1; }
        .team-card:hover {
          transform:scale(1.03);
          box-shadow:0 16px 40px rgba(30,41,59,0.05);
          border-color: var(--accent-secondary);
        }
        .team-avatar-wrap { position:relative; width:96px; height:96px; margin:0 auto 24px; z-index:1; }
        .team-avatar-wrap::after {
          content:""; position:absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
          border-radius:50%; background: linear-gradient(135deg, rgba(217, 240, 255, 0.6), rgba(255, 228, 236, 0.6));
          filter:blur(12px); z-index:-1; opacity:0; transition:opacity 0.3s;
        }
        .team-card:hover .team-avatar-wrap::after { opacity:1; }
        .team-avatar {
          width:100%; height:100%; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:32px; font-weight:800; color:white;
          box-shadow:0 8px 24px rgba(30,41,59,0.1);
          border:3px solid rgba(255,255,255,0.8);
        }
        .team-name { font-size:22px; font-weight:800; color:var(--text-color); margin-bottom:20px; z-index:1; position:relative; }
        .team-links { display:flex; align-items:center; justify-content:center; gap:14px; z-index:1; position:relative; }
        .team-link {
          width:46px; height:46px; border-radius:14px;
          display:flex; align-items:center; justify-content:center;
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(4px);
          border:1px solid rgba(255,255,255,0.8);
          color:var(--text-muted); text-decoration:none;
          transition:all 0.3s;
        }
        .team-link:hover { color:var(--text-color); transform:translateY(-2px) scale(1.05); background:rgba(255,255,255,0.9); }
        .link-email:hover { box-shadow:0 8px 20px rgba(255,228,236,0.8); border-color:#FFE4EC; }
        .link-gh:hover   { box-shadow:0 8px 20px rgba(30,41,59,0.15); border-color:#E2E8F0; }
        .link-li:hover   { box-shadow:0 8px 20px rgba(217,240,255,0.8); border-color:#D9F0FF; }

        /* ── CONTACT ── */
        .contact-section {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 248, 243, 0.5) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius:36px; padding:56px;
          border:1px solid var(--card-border);
          box-shadow: 0 12px 48px rgba(30,41,59,0.04), inset 0 0 30px rgba(255,255,255,0.4);
          display:grid; grid-template-columns:1fr 1.2fr; gap:72px;
          position:relative; overflow:hidden;
          animation:fadeInUp 1s ease-out 0.5s backwards;
        }
        .contact-title { font-size:30px; font-weight:800; color:var(--text-color); margin-bottom:16px; }
        .contact-sub { font-size:16px; color:var(--text-muted); line-height:1.75; margin-bottom:36px; font-weight:400; }
        .contact-item {
          display:flex; align-items:center; gap:20px; margin-bottom:26px;
          padding:24px; border-radius:24px;
          background: rgba(255,255,255,0.5);
          border:1px solid rgba(255,255,255,0.8);
          transition:all 0.3s ease;
        }
        .contact-item:hover {
          background: rgba(255,255,255,0.8);
          transform:translateX(4px) scale(1.02);
          border-color: var(--accent-secondary);
          box-shadow:0 8px 24px rgba(30,41,59,0.03);
        }
        .contact-icon {
          width:56px; height:56px; border-radius:18px;
          background:var(--icon-bg); color:var(--icon-color);
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .contact-label { font-size:13px; color:var(--text-muted); font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; }
        .contact-value { font-size:17px; color:var(--text-color); font-weight:700; text-decoration:none; transition:color 0.25s; }
        .contact-value:hover { color:var(--text-muted); }

        /* ── QUICK LINKS ── */
        .quick-links { display:flex; flex-direction:column; gap:20px; position:relative; z-index:1; }
        .qlink {
          display:flex; align-items:center; justify-content:space-between;
          padding:24px 28px; border-radius:24px;
          background: rgba(255,255,255,0.5);
          backdrop-filter: blur(8px);
          border:1px solid rgba(255,255,255,0.8);
          text-decoration:none; transition:all 0.3s ease; cursor:pointer;
        }
        .qlink:hover {
          background: rgba(255,255,255,0.9);
          border-color: var(--accent-primary);
          transform:translateY(-2px) scale(1.02);
          box-shadow:0 12px 30px rgba(30,41,59,0.04);
        }
        .qlink-left { display:flex; align-items:center; gap:20px; }
        .qlink-icon { width:52px; height:52px; border-radius:18px; display:flex; align-items:center; justify-content:center; }
        .qlink.doctor .qlink-icon  { background:#D9F0FF; color:#1E293B; }
        .qlink.patient .qlink-icon { background:#EAE6FF; color:#1E293B; }
        .qlink.github  .qlink-icon { background:#FFF8F3; color:#1E293B; border: 1px solid rgba(255,255,255,0.8); }
        .qlink-name { font-size:18px; font-weight:800; color:var(--text-color); margin-bottom:6px; }
        .qlink-sub  { font-size:14px; color:var(--text-muted); font-weight:500; }
        .qlink-arrow { color:var(--text-muted); transition:all 0.3s; }
        .qlink:hover .qlink-arrow { color:var(--text-color); transform:translateX(4px); }

        /* ── FOOTER ── */
        .footer {
          text-align:center; padding:40px 24px;
          font-size:15px; color:var(--text-muted); font-weight:600;
          border-top:1px solid rgba(255,255,255,0.4);
          position:relative; z-index:1;
        }
        .footer-heart { color:#FFE4EC; display:inline-block; animation:pulseGlow 2s infinite; text-shadow: 0 0 8px rgba(255,228,236,0.8); }

        @media (max-width:900px) { .contact-section { grid-template-columns:1fr; gap:56px; } }
        @media (max-width:768px) {
          .nav { padding:0 24px; height:68px; }
          .hero { padding:24px 24px 60px; }
          .hero-title { font-size:46px; }
          .body { padding:0 24px 72px; gap: 48px; }
          .contact-section { padding:40px 24px; }
        }
      ` }} />

      <div className="ambient-light light-1" />
      <div className="ambient-light light-2" />
      <div className="ambient-light light-3" />

      <div className="page">

        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo" onClick={() => router.push('/')}>
            <div className="logo-box">
              <img src="/logo2.png" alt="Smriti Logo" style={{width:'80%',height:'80%',objectFit:'contain'}}/>
            </div>
            <div>
              <div className="nav-logo-name">Smriti</div>
              <div className="nav-logo-sub">smart patient insights</div>
            </div>
          </div>
          <button className="nav-back" onClick={() => router.push('/')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Home
          </button>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-tag"><span /> Discover Smriti</div>
          <h1 className="hero-title">
            Empowering precise<br /><span className="highlight">healthcare insights.</span>
          </h1>
          <p className="hero-sub">
            The intelligent system trusted by healthcare professionals for rapid patient
            history retrieval and secure operations. <strong>Engineered by Team Asclepius.</strong>
          </p>
        </div>

        {/* BODY */}
        <div className="body">

          {/* ABOUT */}
          <div className="section-header">
            <h2 className="section-title">About the Project</h2>
            <p className="section-sub">
              Smriti (meaning &quot;memory&quot; in Sanskrit) stores and retrieves patient histories intelligently,
              helping doctors make faster and more accurate decisions in critical moments.
            </p>
          </div>

          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="info-card-label">Core System</div>
              <div className="info-card-value">Smriti AI</div>
              <div className="info-card-sub">Next-gen Healthcare Records</div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>
          </div>

          {/* TEAM */}
          <div className="section-header">
            <h2 className="section-title">Meet the Team</h2>
            <p className="section-sub">
              We are a passionate collective of developers, designers, and AI engineers dedicated to
              transforming the healthcare technology landscape.
            </p>
          </div>

          <div className="team-grid">
            {TEAM.map((m, i) => (
              <div className="team-card" key={i}>
                <div className="team-avatar-wrap">
                  <div className="team-avatar" style={{background: m.color}}>{m.avatar}</div>
                </div>
                <div className="team-name">{m.name}</div>
                <div className="team-links">
                  <a className="team-link link-email" href={`mailto:${m.email}`} aria-label="Email">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </a>
                  <a className="team-link link-gh" href={m.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                    </svg>
                  </a>
                  <a className="team-link link-li" href={m.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                      <rect x="2" y="9" width="4" height="12"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* CONTACT */}
          <div className="section-header">
            <h2 className="section-title">Get in Touch</h2>
            <p className="section-sub">Have questions, feedback, or want to collaborate? We&apos;d love to hear from you.</p>
          </div>

          <div className="contact-section">
            <div>
              <h3 className="contact-title">Contact Us</h3>
              <p className="contact-sub">Drop us a line regarding feature requests, bug reports, or just to say hello to the Asclepius team!</p>
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-label">Team Email</div>
                  <a className="contact-value" href="mailto:teamasclepius@gmail.com">teamasclepius@gmail.com</a>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-label">Location</div>
                  <span className="contact-value">Prayagraj, UP</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="contact-title">Quick Links</h3>
              <p className="contact-sub">Jump straight to our portals or view the source code.</p>
              <div className="quick-links">
                <div className="qlink doctor" onClick={() => router.push('/auth?role=doctor')}>
                  <div className="qlink-left">
                    <div className="qlink-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                    </div>
                    <div>
                      <div className="qlink-name">Doctor Portal</div>
                      <div className="qlink-sub">Access secure medical records</div>
                    </div>
                  </div>
                  <svg className="qlink-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <div className="qlink patient" onClick={() => router.push('/auth?role=patient')}>
                  <div className="qlink-left">
                    <div className="qlink-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div>
                      <div className="qlink-name">Patient Portal</div>
                      <div className="qlink-sub">View personal health history</div>
                    </div>
                  </div>
                  <svg className="qlink-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <a className="qlink github" href="https://github.com/divyanshi864/patient_history_analyzer" target="_blank" rel="noreferrer">
                  <div className="qlink-left">
                    <div className="qlink-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                      </svg>
                    </div>
                    <div>
                      <div className="qlink-name">Source Code</div>
                      <div className="qlink-sub">Explore our GitHub repo</div>
                    </div>
                  </div>
                  <svg className="qlink-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <footer className="footer">
          Built with <span className="footer-heart">❤️</span> by Team Asclepius &middot; Smriti &copy; 2026
        </footer>
      </div>
    </>
  )
}
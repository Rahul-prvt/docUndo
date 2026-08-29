import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { PatientSearch } from './pages/PatientSearch'
import { DoctorSignup } from './pages/DoctorSignup'
import { DoctorLogin } from './pages/DoctorLogin'
import { DoctorDashboard } from './pages/DoctorDashboard'
import { AiChatWidget } from './components/AiChatWidget'
import { useTranslation } from './lib/i18n'
import { useAuthStore } from './lib/store'
import './index.css'

function Navigation() {
  const token = useAuthStore((state) => state.token)
  const clearToken = useAuthStore((state) => state.clearToken)
  const location = useLocation()
  const { t, lang, setLang } = useTranslation()
  const authPage = location.pathname.includes('/doctor/login') || location.pathname.includes('/doctor/signup')
  if (authPage) return null
  return <header className="site-header sticky top-0 z-30">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
      <Link to="/" className="flex items-center gap-3" aria-label="DoctorUndo home"><span className="brand-mark">D</span><span><strong className="block text-[.98rem] tracking-tight">DoctorUndo</strong><span className="eyebrow block text-[.53rem] text-[#718079]">care, made simple</span></span></Link>
      <nav className="hidden items-center gap-4 md:flex">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}>{t('nav.find_doctor')}</Link>
        {token && <Link to="/doctor/dashboard" className={`nav-link ${location.pathname === '/doctor/dashboard' ? 'nav-link-active' : ''}`}>{t('nav.my_practice')}</Link>}
        <div className="flex items-center rounded-full bg-[#e6e8e1] p-1">
          <button onClick={() => setLang('en')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>EN</button>
          <button onClick={() => setLang('ml')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'ml' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>മലയാളം</button>
        </div>
      </nav>
      {token ? <button onClick={() => { clearToken(); window.location.assign('/') }} className="btn-secondary text-xs">Sign out</button> : <div className="flex items-center gap-2"><Link to="/doctor/login" className="hidden text-sm font-semibold text-[#53615c] sm:block">{t('nav.login')}</Link><Link to="/doctor/signup" className="btn-primary text-xs">{t('nav.for_doctors')} <span aria-hidden>↗</span></Link></div>}
    </div>
  </header>
}

function AppShell() {
  const location = useLocation()
  const authPage = location.pathname.includes('/doctor/login') || location.pathname.includes('/doctor/signup')

  // Shared specialty state — chat widget sets it, PatientSearch reads it
  const [chatSpecialty, setChatSpecialty] = useState<string>('')

  return (
    <div className="app-shell">
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<PatientSearch externalSpecialty={chatSpecialty} onSpecialtyConsumed={() => setChatSpecialty('')} />} />
          <Route path="/doctor/signup" element={<DoctorSignup />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        </Routes>
      </main>
      {/* Floating AI chat widget — hidden on auth pages */}
      {!authPage && (
        <AiChatWidget onSpecialtySelected={(s) => setChatSpecialty(s)} />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App

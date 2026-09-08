import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useState } from 'react'
import { PatientSearch } from './pages/PatientSearch'
import { DoctorSignup } from './pages/DoctorSignup'
import { DoctorLogin } from './pages/DoctorLogin'
import { DoctorDashboard } from './pages/DoctorDashboard'
import AdminPage from './pages/AdminPage'
import { AiChatWidget } from './components/AiChatWidget'
import { useTranslation } from './lib/i18n'
import { useAuthStore } from './lib/store'
import './index.css'

function Navigation() {
  const token = useAuthStore((state) => state.token)
  const clearToken = useAuthStore((state) => state.clearToken)
  const location = useLocation()
  const { t, lang, setLang } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdminPage = location.pathname.startsWith('/admin')
  const authPage = location.pathname.includes('/doctor/login') || location.pathname.includes('/doctor/signup')
  if (authPage || isAdminPage) return null

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      <header className="site-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="DoctorUndo home" onClick={closeMobile}>
            <span className="brand-mark">D</span>
            <span>
              <strong className="block text-[.98rem] tracking-tight">DoctorUndo</strong>
              <span className="eyebrow block text-[.53rem] text-[#718079]">care, made simple</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 md:flex">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}>{t('nav.find_doctor')}</Link>
            {token && <Link to="/doctor/dashboard" className={`nav-link ${location.pathname === '/doctor/dashboard' ? 'nav-link-active' : ''}`}>{t('nav.my_practice')}</Link>}
            <div className="flex items-center rounded-full bg-[#e6e8e1] p-1">
              <button onClick={() => setLang('en')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>EN</button>
              <button onClick={() => setLang('ml')} className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${lang === 'ml' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>മലയാളം</button>
            </div>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {token
              ? <button onClick={() => { clearToken(); window.location.assign('/') }} className="btn-secondary text-xs">Sign out</button>
              : <>
                  <Link to="/doctor/login" className="text-sm font-semibold text-[#53615c]">{t('nav.login')}</Link>
                  <Link to="/doctor/signup" className="btn-primary text-xs">{t('nav.for_doctors')} <span aria-hidden>↗</span></Link>
                </>
            }
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-xl bg-[#e6e8e1] text-[#12201e]"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" onClick={closeMobile}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <nav
            className="absolute top-0 right-0 h-full w-72 bg-[#fffefa] shadow-2xl flex flex-col p-6 gap-2"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div className="flex items-center justify-between mb-4">
              <strong className="text-[#12201e]">DoctorUndo</strong>
              <button onClick={closeMobile} className="w-8 h-8 rounded-lg bg-[#e6e8e1] grid place-items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <Link to="/" onClick={closeMobile} className={`nav-link py-3 text-base border-b border-[#e6e8e1] ${location.pathname === '/' ? 'nav-link-active' : ''}`}>
              🔍 {t('nav.find_doctor')}
            </Link>
            {token && (
              <Link to="/doctor/dashboard" onClick={closeMobile} className={`nav-link py-3 text-base border-b border-[#e6e8e1] ${location.pathname === '/doctor/dashboard' ? 'nav-link-active' : ''}`}>
                🩺 {t('nav.my_practice')}
              </Link>
            )}

            {/* Language */}
            <div className="mt-2">
              <p className="eyebrow text-[#718079] mb-2">Language</p>
              <div className="flex gap-2">
                <button onClick={() => setLang('en')} className={`flex-1 rounded-xl py-2 text-sm font-bold border transition ${lang === 'en' ? 'bg-[#12201e] text-white border-[#12201e]' : 'border-[#d7dbd3] text-[#53615c]'}`}>EN</button>
                <button onClick={() => setLang('ml')} className={`flex-1 rounded-xl py-2 text-sm font-bold border transition ${lang === 'ml' ? 'bg-[#12201e] text-white border-[#12201e]' : 'border-[#d7dbd3] text-[#53615c]'}`}>മലയാളം</button>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              {token
                ? <button onClick={() => { clearToken(); window.location.assign('/'); closeMobile(); }} className="btn-secondary w-full">Sign out</button>
                : <>
                    <Link to="/doctor/login" onClick={closeMobile} className="btn-secondary w-full text-center">{t('nav.login')}</Link>
                    <Link to="/doctor/signup" onClick={closeMobile} className="btn-primary w-full text-center">{t('nav.for_doctors')} ↗</Link>
                  </>
              }
              <Link to="/admin" onClick={closeMobile} className="text-center text-[11px] font-semibold text-[#718079] hover:text-[#12201e] pt-1">
                Admin Console ↗
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}


function AppShell() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
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
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      {/* Floating AI chat widget — hidden on auth & admin pages */}
      {!authPage && !isAdminPage && (
        <AiChatWidget onSpecialtySelected={(s) => setChatSpecialty(s)} />
      )}
    </div>
  )
}

function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} language="en" region="IN">
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </APIProvider>
  )
}

export default App

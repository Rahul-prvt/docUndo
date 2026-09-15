import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useEffect, useState } from 'react'
import { PatientSearch } from './pages/PatientSearch'
import { DoctorSignup } from './pages/DoctorSignup'
import { DoctorLogin } from './pages/DoctorLogin'
import { DoctorDashboard } from './pages/DoctorDashboard'
import AdminPage from './pages/AdminPage'
import { AiChatWidget } from './components/AiChatWidget'
import { useTranslation } from './lib/i18n'
import { useAuthStore } from './lib/store'
import { Modal } from './components/ui'
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
              <span className="eyebrow block text-[.53rem] text-[#718079]">{t('app.tagline')}</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden items-center gap-4 md:flex">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : ''}`}>{t('nav.find_doctor')}</Link>
            {token && <Link to="/doctor/dashboard" className={`nav-link ${location.pathname === '/doctor/dashboard' ? 'nav-link-active' : ''}`}>{t('nav.my_practice')}</Link>}
            <div className="flex items-center rounded-lg bg-[#f0f4f1] p-1">
              <button aria-pressed={lang === 'en'} aria-label="English" onClick={() => setLang('en')} className={`min-h-[36px] rounded-md px-2 py-1 text-xs font-bold transition-all ${lang === 'en' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>EN</button>
              <button aria-pressed={lang === 'ml'} aria-label="മലയാളം" onClick={() => setLang('ml')} className={`min-h-[36px] rounded-md px-2 py-1 text-xs font-bold transition-all ${lang === 'ml' ? 'bg-white text-[#12201e] shadow-sm' : 'text-[#718079]'}`}>മലയാളം</button>
            </div>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {token
              ? <button onClick={() => { clearToken(); window.location.assign('/') }} className="btn-secondary text-xs">{t('nav.signout')}</button>
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
            aria-label={t('app.navigation')} aria-expanded={mobileOpen} aria-haspopup="dialog"
          >
            {mobileOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </header>

      <Modal open={mobileOpen} onOpenChange={setMobileOpen} title={t('app.navigation')}>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
          <Link to="/" onClick={closeMobile} className="nav-link">{t('nav.find_doctor')}</Link>
          {token && <Link to="/doctor/dashboard" onClick={closeMobile} className="nav-link">{t('nav.my_practice')}</Link>}
          <div className="border-y border-[#dce3df] py-3">
            <p className="field-label">{t('app.language')}</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button className="btn-secondary flex-1" aria-pressed={lang === 'ml'} onClick={() => setLang('ml')}>മലയാളം</button>
            </div>
          </div>
          {token ? <button onClick={() => { clearToken(); window.location.assign('/') }} className="btn-secondary">{t('nav.signout')}</button> : <>
            <Link to="/doctor/login" onClick={closeMobile} className="btn-secondary">{t('nav.login')}</Link>
            <Link to="/doctor/signup" onClick={closeMobile} className="btn-primary">{t('nav.for_doctors')}</Link>
          </>}
          <Link to="/admin" onClick={closeMobile} className="btn-ghost">{t('app.admin_console')}</Link>
        </nav>
      </Modal>
    </>
  )
}


function AppShell() {
  const navigate = useNavigate()
  const { t, lang } = useTranslation()
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const authPage = location.pathname.includes('/doctor/login') || location.pathname.includes('/doctor/signup')

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  // Shared specialty state — chat widget sets it, PatientSearch reads it
  const [chatSpecialty, setChatSpecialty] = useState<string>('')

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">{t('app.skip_to_content')}</a>
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<PatientSearch externalSpecialty={chatSpecialty} onSpecialtyConsumed={() => setChatSpecialty('')} />} />
          <Route path="/doctor/signup" element={<DoctorSignup />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<div className="page-container"><h1 className="page-title">{t('app.not_found')}</h1><Link to="/" className="btn-primary mt-5">{t('nav.find_doctor')}</Link></div>} />
        </Routes>
      </main>
      {/* Floating AI chat widget — hidden on auth & admin pages */}
      {!authPage && !isAdminPage && (
        <AiChatWidget onSpecialtySelected={(s) => { setChatSpecialty(s); navigate('/') }} />
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

import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LangProvider, useLang } from './lib/lang'
import { Sidebar, BottomNav } from './components/shell/Nav'
import { RecordPage } from './pages/RecordPage'
import { RecordsPage } from './pages/RecordsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AskPage } from './pages/AskPage'
import { registerWebMCPTools } from './lib/webmcp-register'

function LangToggle() {
  const { lang, toggle } = useLang()
  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 surface surface-hover rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
    >
      {lang === 'en' ? 'SW' : 'EN'}
    </button>
  )
}

function Shell() {
  useEffect(() => { registerWebMCPTools() }, [])

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-[#0c0c0d]/80 backdrop-blur-xl border-b border-white/[0.04] safe-top">
          <div className="px-4 md:px-8 h-14 flex items-center justify-between max-w-5xl">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-xs font-bold text-white">K</span>
              </div>
              <span className="font-display font-semibold text-white text-sm">Kumbuka</span>
            </div>
            <div className="hidden md:block" />
            <LangToggle />
          </div>
        </header>
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ask" element={<AskPage />} />
        </Routes>
        <div className="h-20 md:hidden" />
        <BottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  )
}

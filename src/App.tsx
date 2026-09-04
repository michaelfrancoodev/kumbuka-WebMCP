import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { clsx } from 'clsx'
import { LangProvider, useLang } from './lib/lang'
import { Sidebar, BottomNav } from './components/shell/Nav'
import { RecordPage } from './pages/RecordPage'
import { RecordsPage } from './pages/RecordsPage'
import { RecordDetailPage } from './pages/RecordDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { AskPage } from './pages/AskPage'
import { registerWebMCPTools } from './lib/webmcp-register'

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-medium">
      {(['en', 'sw'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={clsx(
            'px-2.5 py-1 rounded-md transition-colors',
            lang === l ? 'bg-accent text-black' : 'text-white/50 hover:text-white',
          )}
          aria-pressed={lang === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
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
              <div className="w-6 h-6 rounded bg-accent/10 border border-accent/25 flex items-center justify-center">
                <span className="text-xs font-bold text-accent-light">K</span>
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
          <Route path="/records/:id" element={<RecordDetailPage />} />
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

import { NavLink, useLocation } from 'react-router-dom'
import { Mic, ListChecks, BarChart3, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useLang } from '../../lib/lang'

export function BottomNav() {
  const { lang, t } = useLang()
  const loc = useLocation()

  const items = [
    { to: '/',        icon: Mic,         label: t('record') },
    { to: '/records', icon: ListChecks,  label: t('records') },
    { to: '/reports', icon: BarChart3,   label: t('reports') },
    { to: '/ask',     icon: Search,      label: t('ask') },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0d]/90 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto flex items-center justify-around px-4 py-2.5">
        {items.map(({ to, icon: Icon, label }) => {
          const active = loc.pathname === to
          return (
            <NavLink key={to} to={to} className="flex flex-col items-center gap-1 px-4 py-1 relative transition-all">
              <Icon
                className={clsx('w-5 h-5 transition-colors', active ? 'text-accent-light' : 'text-white/40')}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={clsx('text-[10px] font-medium transition-colors', active ? 'text-white' : 'text-white/40')}>
                {label}
              </span>
              {active && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export function Sidebar() {
  const { t } = useLang()
  const loc = useLocation()

  const items = [
    { to: '/',        icon: Mic,         label: t('record') },
    { to: '/records', icon: ListChecks,  label: t('records') },
    { to: '/reports', icon: BarChart3,   label: t('reports') },
    { to: '/ask',     icon: Search,      label: t('ask') },
  ]

  return (
    <aside className="hidden md:flex flex-col gap-1 w-56 shrink-0 border-r border-white/[0.06] p-3 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-3 py-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center">
          <Mic className="w-4 h-4 text-accent-light" />
        </div>
        <span className="font-display font-semibold text-white">Kumbuka</span>
      </div>
      <div className="h-px bg-white/[0.06] my-1" />
      {items.map(({ to, icon: Icon, label }) => {
        const active = loc.pathname === to
        return (
          <NavLink
            key={to}
            to={to}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
              active ? 'bg-accent/10 text-white border border-accent/20' : 'text-white/50 hover:text-white hover:bg-white/5',
            )}
          >
            <Icon className={clsx('w-4 h-4', active && 'text-accent-light')} strokeWidth={active ? 2.5 : 2} />
            {label}
          </NavLink>
        )
      })}
    </aside>
  )
}

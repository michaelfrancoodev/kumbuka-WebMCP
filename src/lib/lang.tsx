import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Lang } from './i18n'
import { tr } from './i18n'

interface LangCtx {
  lang: Lang
  t: (k: string) => string
  toggle: () => void
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'en', t: () => '', toggle: () => {}, setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('kumbuka-lang')
    return saved === 'sw' ? 'sw' : 'en'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('kumbuka-lang', l)
  }, [])

  const toggle = useCallback(() => setLang(lang === 'en' ? 'sw' : 'en'), [lang, setLang])
  const t = useCallback((k: string) => tr(k, lang), [lang])

  return <Ctx.Provider value={{ lang, t, toggle, setLang }}>{children}</Ctx.Provider>
}

export function useLang() {
  return useContext(Ctx)
}

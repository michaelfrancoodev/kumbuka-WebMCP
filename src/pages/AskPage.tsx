import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowUpRight } from 'lucide-react'
import { useLang } from '../lib/lang'
import { useRecords } from '../hooks/useRecords'
import { formatTSh } from '../lib/money'
import { formatDate, formatTime } from '../lib/dates'
import { runQuery, buildSuggestions } from '../lib/query'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Sheet'

export function AskPage() {
  const { t } = useLang()
  const { records } = useRecords()
  const [query, setQuery] = useState('')

  const { records: results, dateLabelKey, answer } = useMemo(() => runQuery(query, records), [query, records])
  const suggestions = useMemo(() => buildSuggestions(records), [records])

  const totalAmount = results.reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-white mb-6">{t('ask')}</h1>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('askPlaceholder')}
          className="input w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white"
        />
      </div>

      {!query && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-white/30 mr-1 self-center">{t('tryAsking')}:</span>
          {suggestions.map((s, i) => {
            const label = s.kind === 'literal' ? s.value : s.kind === 'today' ? t('today') : t('thisWeek')
            return (
              <button
                key={i}
                onClick={() => setQuery(label)}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 transition-colors"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {query && (
        <>
          {results.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-16">{t('noResults')}</p>
          ) : (
            <>
              {dateLabelKey && (
                <p className="text-xs text-white/30 mb-3">{t('showingFor')} <span className="text-white/60">{t(dateLabelKey)}</span></p>
              )}

              {answer && (
                <Card className="p-4 mb-4 border-accent/20 bg-accent/[0.04]">
                  <div className="grid grid-cols-2 gap-4">
                    {answer.map(a => (
                      <div key={a.labelKey}>
                        <p className="text-xs text-white/40 mb-1">{t(a.labelKey)}</p>
                        <p className="text-sm font-semibold text-white">{a.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-white/40">
                  {results.length} {t('recordsFound')}
                </p>
                {totalAmount > 0 && <p className="text-sm font-semibold text-white">{formatTSh(totalAmount)}</p>}
              </div>
              <p className="text-xs text-white/30 mb-3">{t('evidence')}</p>
              <div className="flex flex-col gap-2.5">
                {results.map(r => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className="bg-white/5 text-white/50 border-white/10 capitalize">{r.type}</Badge>
                      {r.person && <span className="text-sm text-white/70">{r.person}</span>}
                      {r.amount !== undefined && <span className="text-sm font-medium text-white">{formatTSh(r.amount)}</span>}
                    </div>
                    <p className="text-sm font-medium text-white/90 mb-0.5">{r.title}</p>
                    <p className="text-sm text-white/60">"{r.originalText}"</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-white/30">{formatDate(r.createdAt)} · {formatTime(r.createdAt)}</p>
                      <Link to={`/records/${r.id}`} className="text-xs text-white/40 hover:text-white inline-flex items-center gap-1">
                        {t('viewOriginal')} <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

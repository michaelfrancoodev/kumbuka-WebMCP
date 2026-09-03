import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useLang } from '../lib/lang'
import { useRecords } from '../hooks/useRecords'
import { formatTSh } from '../lib/money'
import { formatDate, formatTime } from '../lib/dates'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Sheet'

const SUGGESTIONS = ['diesel', 'John', 'this week', 'cement']

export function AskPage() {
  const { t } = useLang()
  const { records } = useRecords()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return records.filter(r =>
      r.originalText.toLowerCase().includes(q) ||
      r.person?.toLowerCase().includes(q) ||
      r.item?.toLowerCase().includes(q) ||
      r.note?.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q),
    )
  }, [records, query])

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
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {query && (
        <>
          {results.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-16">{t('noResults')}</p>
          ) : (
            <>
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
                    <p className="text-sm text-white/80">{r.originalText}</p>
                    <p className="text-xs text-white/30 mt-1">{formatDate(r.createdAt)} · {formatTime(r.createdAt)}</p>
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

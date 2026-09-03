import { useMemo, useState } from 'react'
import { Trash2, Mic, Keyboard, Bot } from 'lucide-react'
import { useLang } from '../lib/lang'
import { useRecords } from '../hooks/useRecords'
import { formatTSh } from '../lib/money'
import { formatDate, formatTime, timeAgo } from '../lib/dates'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Sheet'
import type { RecordType } from '../lib/types'

const TYPE_OPTIONS: RecordType[] = ['expense', 'income', 'activity', 'other']

const SOURCE_ICON = { voice: Mic, text: Keyboard, agent: Bot }

export function RecordsPage() {
  const { t } = useLang()
  const { records, loading, remove, clearAll } = useRecords()
  const [filter, setFilter] = useState<RecordType | 'all'>('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = useMemo(
    () => (filter === 'all' ? records : records.filter(r => r.type === filter)),
    [records, filter],
  )

  async function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    await clearAll()
    setConfirmClear(false)
  }

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-semibold text-white">{t('records')}</h1>
        {records.length > 0 && (
          <button onClick={handleClearAll} className="text-xs text-white/40 hover:text-red-400 transition-colors">
            {confirmClear ? t('clearConfirm') : t('clearAll')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip label={t('allTypes')} active={filter === 'all'} onClick={() => setFilter('all')} />
        {TYPE_OPTIONS.map(opt => (
          <FilterChip key={opt} label={opt} active={filter === opt} onClick={() => setFilter(opt)} />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-white/40">…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/50 font-medium mb-1">{t('noRecords')}</p>
          <p className="text-white/30 text-sm">{t('noRecordsHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(r => {
            const SourceIcon = SOURCE_ICON[r.source]
            return (
              <Card key={r.id} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <SourceIcon className="w-4 h-4 text-white/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={typeBadgeClass(r.type)}>{r.type}</Badge>
                    {r.person && <span className="text-sm text-white/70">{r.person}</span>}
                    {r.amount !== undefined && <span className="text-sm font-medium text-white">{formatTSh(r.amount)}</span>}
                  </div>
                  <p className="text-sm text-white/80 truncate">{r.item || r.note || r.originalText}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {formatDate(r.createdAt)} · {formatTime(r.createdAt)} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <button onClick={() => remove(r.id)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
        active ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )
}

function typeBadgeClass(type: RecordType): string {
  switch (type) {
    case 'expense': return 'bg-red-500/10 text-red-300 border-red-500/20'
    case 'income': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    case 'activity': return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    default: return 'bg-white/5 text-white/50 border-white/10'
  }
}

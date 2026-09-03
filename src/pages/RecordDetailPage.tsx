import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, Keyboard, Bot, Trash2 } from 'lucide-react'
import { useLang } from '../lib/lang'
import { db, deleteRecord } from '../lib/db'
import { formatTSh } from '../lib/money'
import { formatDate, formatTime, timeAgo } from '../lib/dates'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Sheet'
import type { ActivityRecord, RecordType } from '../lib/types'

const SOURCE_ICON = { voice: Mic, text: Keyboard, agent: Bot }

function typeBadgeClass(type: RecordType): string {
  switch (type) {
    case 'expense': return 'bg-red-500/10 text-red-300 border-red-500/20'
    case 'income': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    case 'activity': return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    default: return 'bg-white/5 text-white/50 border-white/10'
  }
}

// Every record in Kumbuka is reachable at a stable /records/:id URL, so
// "view original record" links from Reports, Ask, and the Records list all
// resolve to the same permanent place — the raw narration is always one tap away.
export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLang()
  const [record, setRecord] = useState<ActivityRecord | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    db.records.get(id).then(r => { if (!cancelled) setRecord(r ?? null) })
    return () => { cancelled = true }
  }, [id])

  async function handleDelete() {
    if (!id) return
    await deleteRecord(id)
    navigate('/records')
  }

  if (record === undefined) {
    return <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto text-sm text-white/40">…</div>
  }

  if (record === null) {
    return (
      <div className="px-4 md:px-8 py-16 max-w-2xl mx-auto text-center">
        <p className="text-white/60 mb-4">{t('noRecords')}</p>
        <Link to="/records" className="text-sm text-white/50 hover:text-white inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> {t('records')}
        </Link>
      </div>
    )
  }

  const SourceIcon = SOURCE_ICON[record.source]

  return (
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t('records')}
      </button>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-white mb-2">{record.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={typeBadgeClass(record.type)}>{record.type}</Badge>
            {record.confirmed && <Badge className="bg-white/5 text-white/40 border-white/10">{t('confirmed')}</Badge>}
          </div>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0" title={record.source}>
          <SourceIcon className="w-4 h-4 text-white/50" />
        </div>
      </div>

      <Card className="p-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          {record.person && <Field label={t('person')} value={record.person} />}
          {record.amount !== undefined && <Field label={t('amount')} value={formatTSh(record.amount)} />}
          {record.item && <Field label={t('item')} value={record.item} />}
          {record.unit && <Field label={t('unit')} value={record.unit} />}
        </div>
        <div className="h-px bg-white/[0.06] my-4" />
        <p className="text-xs text-white/30">
          {formatDate(record.createdAt)} · {formatTime(record.createdAt)} · {timeAgo(record.createdAt)}
        </p>
      </Card>

      <Card className="p-5 mb-6 border-white/[0.1]">
        <p className="text-xs font-medium text-white/40 mb-2 uppercase tracking-wide">{t('original')}</p>
        <p className="text-sm text-white/85 leading-relaxed">"{record.originalText}"</p>
        {record.note && record.note !== record.originalText && (
          <p className="text-xs text-white/40 mt-3">{t('note')}: {record.note}</p>
        )}
      </Card>

      <Button variant="danger" size="sm" onClick={handleDelete}>
        <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
      </Button>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  )
}

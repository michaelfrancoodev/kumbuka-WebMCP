import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, TrendingDown, TrendingUp, Wallet, ArrowUpRight, CalendarDays } from 'lucide-react'
import { clsx } from 'clsx'
import { useLang } from '../lib/lang'
import { useRecords } from '../hooks/useRecords'
import { formatTSh } from '../lib/money'
import {
  getCurrentRange, shiftRange, eachDayInRange, startOfDay, endOfDay, formatTime,
  type RangeType,
} from '../lib/dates'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Sheet'
import { CalendarPopover } from '../components/ui/CalendarPopover'
import type { ActivityRecord, RecordType } from '../lib/types'

const RANGE_OPTIONS: RangeType[] = ['day', 'week', 'month']
const TYPE_FILTERS: Array<RecordType | 'all'> = ['all', 'expense', 'income', 'activity']

export function ReportsPage() {
  const { t } = useLang()
  const { records } = useRecords()
  const [rangeType, setRangeType] = useState<RangeType>('week')
  const [range, setRange] = useState(() => getCurrentRange('week'))
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all')
  const [calendarOpen, setCalendarOpen] = useState(false)

  function changeRangeType(rt: RangeType) {
    setRangeType(rt)
    setRange(getCurrentRange(rt, range.start))
  }

  function shift(dir: -1 | 1) {
    setRange(prev => shiftRange(prev, rangeType, dir))
  }

  function jumpToToday() {
    setRange(getCurrentRange(rangeType))
  }

  function handleCalendarSelect(picked: Date) {
    setRange(getCurrentRange(rangeType, picked))
    setCalendarOpen(false)
  }

  // Every record whose createdAt falls inside the selected range and matches
  // the active type filter, oldest first — one consistent chronological
  // order used throughout day/week/month views.
  const inRange = useMemo(
    () =>
      records
        .filter(r => r.createdAt >= range.start.getTime() && r.createdAt <= range.end.getTime())
        .filter(r => typeFilter === 'all' || r.type === typeFilter)
        .sort((a, b) => a.createdAt - b.createdAt),
    [records, range, typeFilter],
  )

  const totalOut = inRange.filter(r => r.type === 'expense').reduce((s, r) => s + (r.amount || 0), 0)
  const totalIn = inRange.filter(r => r.type === 'income').reduce((s, r) => s + (r.amount || 0), 0)
  const balance = totalIn - totalOut

  const byType = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of inRange) m.set(r.type, (m.get(r.type) || 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [inRange])

  const byPerson = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of inRange) if (r.person && r.amount) m.set(r.person, (m.get(r.person) || 0) + r.amount)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [inRange])

  // Every calendar day in the range, even ones with zero records — this is
  // what guarantees week/month rollups never silently skip a day.
  const days = useMemo(() => eachDayInRange(range.start, range.end), [range])

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-white mb-6">{t('reports')}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map(rt => (
            <button
              key={rt}
              onClick={() => changeRangeType(rt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rangeType === rt ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t(rt)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50" aria-label="previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={jumpToToday} className="px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/50 text-xs font-medium">
            {t('today')}
          </button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50" aria-label="next">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setCalendarOpen(o => !o)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                calendarOpen ? 'bg-accent/10 border-accent/30 text-accent-light' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {t('jumpTo')}
            </button>
            {calendarOpen && (
              <CalendarPopover
                mode={rangeType}
                value={range.start}
                onSelect={handleCalendarSelect}
                onClose={() => setCalendarOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-white/50 mb-4">{range.label} · {range.sublabel}</p>

      <div className="flex gap-1.5 mb-6">
        {TYPE_FILTERS.map(tf => (
          <button
            key={tf}
            onClick={() => setTypeFilter(tf)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              typeFilter === tf ? 'bg-accent/15 text-accent-light border border-accent/30' : 'text-white/40 hover:text-white/70 border border-transparent',
            )}
          >
            {tf === 'all' ? t('filterAll') : t(`type_${tf}`)}
          </button>
        ))}
      </div>

      {inRange.length === 0 ? (
        <p className="text-white/30 text-sm text-center py-16">{t('noData')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard icon={TrendingDown} label={t('totalOut')} value={formatTSh(totalOut)} tone="red" />
            <StatCard icon={TrendingUp} label={t('totalIn')} value={formatTSh(totalIn)} tone="emerald" />
            <StatCard icon={Wallet} label={t('balance')} value={formatTSh(balance)} tone={balance >= 0 ? 'emerald' : 'red'} />
          </div>

          <p className="text-xs text-white/30 mb-6">{inRange.length} {t('recordsInPeriod')}</p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card className="p-5">
              <h3 className="text-sm font-medium text-white/70 mb-3">{t('byType')}</h3>
              <div className="flex flex-col gap-2">
                {byType.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-white/60 capitalize">{type}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-medium text-white/70 mb-3">{t('topPeople')}</h3>
              {byPerson.length === 0 ? (
                <p className="text-xs text-white/30">{t('noData')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {byPerson.map(([person, amount]) => (
                    <div key={person} className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{person}</span>
                      <span className="text-white font-medium">{formatTSh(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {rangeType === 'day' ? (
        <DayRecordList records={inRange} />
      ) : (
        <>
          <h2 className="text-sm font-medium text-white/70 mb-3">{t('dailyBreakdown')}</h2>
          <div className="flex flex-col gap-2">
            {days.map(day => (
              <DayAccordion
                key={day.getTime()}
                day={day}
                records={inRange.filter(r => r.createdAt >= startOfDay(day).getTime() && r.createdAt <= endOfDay(day).getTime())}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'red' | 'emerald' }) {
  return (
    <Card className="p-4">
      <Icon className={`w-4 h-4 mb-2 ${tone === 'red' ? 'text-red-400' : 'text-emerald-400'}`} />
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{value}</p>
    </Card>
  )
}

// A single day's row within a week/month rollup. Always rendered — even at
// zero records — and expands to show every record for that day in order,
// each linking back to its own permanent record page.
function DayAccordion({ day, records }: { day: Date; records: ActivityRecord[] }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const hasRecords = records.length > 0
  const dayOut = records.filter(r => r.type === 'expense').reduce((s, r) => s + (r.amount || 0), 0)
  const dayIn = records.filter(r => r.type === 'income').reduce((s, r) => s + (r.amount || 0), 0)

  return (
    <Card className={clsx('overflow-hidden', !hasRecords && 'opacity-50')}>
      <button
        onClick={() => hasRecords && setOpen(o => !o)}
        disabled={!hasRecords}
        className="w-full flex items-center justify-between gap-3 p-4 text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={clsx('w-4 h-4 text-white/30 shrink-0 transition-transform', open && 'rotate-180', !hasRecords && 'opacity-0')} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              {day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-xs text-white/40">
              {hasRecords ? `${records.length} ${t('recordsInPeriod')}` : t('noRecordsForDay')}
            </p>
          </div>
        </div>
        {hasRecords && (
          <div className="text-right shrink-0 text-xs">
            {dayIn > 0 && <p className="text-emerald-400 font-medium">+{formatTSh(dayIn)}</p>}
            {dayOut > 0 && <p className="text-red-400 font-medium">-{formatTSh(dayOut)}</p>}
          </div>
        )}
      </button>
      {open && hasRecords && (
        <div className="border-t border-white/[0.06] px-4 pb-3 pt-1 flex flex-col gap-2">
          {records.map(r => (
            <Link
              key={r.id}
              to={`/records/${r.id}`}
              className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-white/5 text-white/40 border-white/10 capitalize">{r.type}</Badge>
                  <span className="text-xs text-white/30">{formatTime(r.createdAt)}</span>
                </div>
                <p className="text-sm text-white/85 truncate mt-0.5">{r.title}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.amount !== undefined && <span className="text-sm font-medium text-white">{formatTSh(r.amount)}</span>}
                <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

// Flat chronological list used for the single-day view (no accordion needed —
// there's only one day, so just show everything for it directly).
function DayRecordList({ records }: { records: ActivityRecord[] }) {
  const { t } = useLang()
  if (records.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-white/70 mb-1">{t('recordsInPeriod')}</h2>
      {records.map(r => (
        <Link key={r.id} to={`/records/${r.id}`}>
          <Card className="p-4 flex items-center justify-between gap-3" hover>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-white/5 text-white/40 border-white/10 capitalize">{r.type}</Badge>
                <span className="text-xs text-white/30">{formatTime(r.createdAt)}</span>
              </div>
              <p className="text-sm text-white/85 truncate">{r.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.amount !== undefined && <span className="text-sm font-medium text-white">{formatTSh(r.amount)}</span>}
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}

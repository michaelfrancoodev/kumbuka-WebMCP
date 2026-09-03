import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useLang } from '../lib/lang'
import { useRecords } from '../hooks/useRecords'
import { formatTSh } from '../lib/money'
import { getCurrentRange, shiftRange, type RangeType } from '../lib/dates'
import { Card } from '../components/ui/Card'

const RANGE_OPTIONS: RangeType[] = ['day', 'week', 'month']

export function ReportsPage() {
  const { t } = useLang()
  const { records } = useRecords()
  const [rangeType, setRangeType] = useState<RangeType>('week')
  const [range, setRange] = useState(() => getCurrentRange('week'))

  function changeRangeType(rt: RangeType) {
    setRangeType(rt)
    setRange(getCurrentRange(rt))
  }

  function shift(dir: -1 | 1) {
    setRange(prev => shiftRange(prev, rangeType, dir))
  }

  const inRange = useMemo(
    () => records.filter(r => r.createdAt >= range.start.getTime() && r.createdAt <= range.end.getTime()),
    [records, range],
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

  return (
    <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-white mb-6">{t('reports')}</h1>

      <div className="flex items-center justify-between mb-4">
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
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-white/50 mb-6">{range.label} · {range.sublabel}</p>

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

          <div className="grid md:grid-cols-2 gap-4">
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

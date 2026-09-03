export type RangeType = 'day' | 'week' | 'month'

export interface DateRange {
  start: Date
  end: Date
  label: string
  sublabel: string
}

export function startOfDay(d: Date): Date {
  const n = new Date(d); n.setHours(0, 0, 0, 0); return n
}
export function endOfDay(d: Date): Date {
  const n = new Date(d); n.setHours(23, 59, 59, 999); return n
}
export function startOfWeek(d: Date): Date {
  const n = startOfDay(d)
  const day = n.getDay()
  const diff = n.getDate() - day + (day === 0 ? -6 : 1)
  n.setDate(diff); return n
}
export function endOfWeek(d: Date): Date {
  const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); return endOfDay(e)
}
export function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
export function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) }

export function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
export function addWeeks(d: Date, n: number): Date { return addDays(d, n * 7) }
export function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r }

export function getCurrentRange(type: RangeType, ref: Date = new Date()): DateRange {
  switch (type) {
    case 'day':
      return {
        start: startOfDay(ref), end: endOfDay(ref),
        label: ref.toLocaleDateString('en-US', { weekday: 'long' }),
        sublabel: ref.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }
    case 'week': {
      const s = startOfWeek(ref), e = endOfWeek(ref)
      return {
        start: s, end: e,
        label: `Week of ${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        sublabel: `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      }
    }
    case 'month':
      return {
        start: startOfMonth(ref), end: endOfMonth(ref),
        label: ref.toLocaleDateString('en-US', { month: 'long' }),
        sublabel: ref.toLocaleDateString('en-US', { year: 'numeric' }),
      }
  }
}

export function shiftRange(r: DateRange, type: RangeType, dir: -1 | 1): DateRange {
  const ref = new Date(r.start)
  switch (type) {
    case 'day': return getCurrentRange('day', addDays(ref, dir))
    case 'week': return getCurrentRange('week', addWeeks(ref, dir))
    case 'month': return getCurrentRange('month', addMonths(ref, dir))
  }
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

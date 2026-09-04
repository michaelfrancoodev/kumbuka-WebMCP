import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { startOfDay, endOfDay } from '../../lib/dates'

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarPopoverProps {
  mode: 'day' | 'week' | 'month'
  /** Currently selected reference date (e.g. range.start). */
  value: Date
  onSelect: (d: Date) => void
  onClose: () => void
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// A real, clickable month-grid calendar — the kind you'd see picking a date
// of birth — instead of relying on each browser/OS's plain native <input
// type="date">. Day/week modes show a day grid; month mode shows a 12-month
// grid for the year, since day-level precision isn't meaningful there.
export function CalendarPopover({ mode, value, onSelect, onClose }: CalendarPopoverProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (mode === 'month') {
    return (
      <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-[#161617] shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <button onClick={() => setViewYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white">{viewYear}</span>
          <button onClick={() => setViewYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_LABELS.map((m, i) => {
            const selected = viewYear === value.getFullYear() && i === value.getMonth()
            return (
              <button
                key={m}
                onClick={() => onSelect(new Date(viewYear, i, 1))}
                className={clsx(
                  'py-2 rounded-lg text-xs font-medium transition-colors',
                  selected ? 'bg-accent text-black' : 'text-white/70 hover:bg-white/10',
                )}
              >
                {m.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // day / week mode — a standard day-grid month calendar
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedWeekStart = mode === 'week' ? startOfDay(value) : null
  const selectedWeekEnd = mode === 'week' ? endOfDay(new Date(value.getFullYear(), value.getMonth(), value.getDate() + (6 - ((value.getDay() + 6) % 7)))) : null

  function shiftMonth(dir: -1 | 1) {
    let m = viewMonth + dir
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m); setViewYear(y)
  }

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-white/10 bg-[#161617] shadow-2xl p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-white">{MONTH_LABELS[viewMonth]} {viewYear}</span>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map(w => (
          <span key={w} className="text-[10px] font-medium text-white/30 pb-1">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const isSelectedDay = mode === 'day' && isSameDay(d, value)
          const inSelectedWeek =
            mode === 'week' && selectedWeekStart && selectedWeekEnd &&
            d.getTime() >= selectedWeekStart.getTime() && d.getTime() <= selectedWeekEnd.getTime()
          const isToday = isSameDay(d, new Date())
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className={clsx(
                'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                isSelectedDay && 'bg-accent text-black',
                inSelectedWeek && !isSelectedDay && 'bg-accent/20 text-white',
                !isSelectedDay && !inSelectedWeek && 'text-white/70 hover:bg-white/10',
                isToday && !isSelectedDay && !inSelectedWeek && 'ring-1 ring-accent/40',
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

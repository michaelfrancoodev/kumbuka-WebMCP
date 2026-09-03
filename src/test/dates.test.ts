import { describe, it, expect } from 'vitest'
import {
  eachDayInRange, getCurrentRange,
  toIsoDateInput, fromIsoDateInput,
  toIsoWeekInput, fromIsoWeekInput,
  toIsoMonthInput, fromIsoMonthInput,
} from '../lib/dates'

describe('eachDayInRange', () => {
  it('never skips a day across a full month, including short/long months', () => {
    const feb = getCurrentRange('month', new Date(2026, 1, 10)) // Feb 2026 (28 days, not a leap year)
    expect(eachDayInRange(feb.start, feb.end)).toHaveLength(28)

    const aug = getCurrentRange('month', new Date(2026, 7, 10)) // Aug 2026 (31 days)
    expect(eachDayInRange(aug.start, aug.end)).toHaveLength(31)
  })

  it('always returns exactly 7 days for a week range', () => {
    const week = getCurrentRange('week', new Date(2026, 8, 3))
    expect(eachDayInRange(week.start, week.end)).toHaveLength(7)
  })

  it('returns a single day for a day range', () => {
    const day = getCurrentRange('day', new Date(2026, 8, 3))
    expect(eachDayInRange(day.start, day.end)).toHaveLength(1)
  })

  it('produces consecutive, gap-free calendar days', () => {
    const month = getCurrentRange('month', new Date(2026, 8, 1))
    const days = eachDayInRange(month.start, month.end)
    for (let i = 1; i < days.length; i++) {
      const diff = days[i].getTime() - days[i - 1].getTime()
      expect(diff).toBe(24 * 60 * 60 * 1000)
    }
  })
})

describe('calendar input round-trips', () => {
  it('round-trips a date input value', () => {
    const d = new Date(2026, 8, 3)
    expect(fromIsoDateInput(toIsoDateInput(d))?.toDateString()).toBe(d.toDateString())
  })

  it('round-trips a week input value to that week\'s Monday', () => {
    const d = new Date(2026, 8, 3) // Thursday
    const monday = fromIsoWeekInput(toIsoWeekInput(d))!
    expect(monday.getDay()).toBe(1)
  })

  it('round-trips a month input value', () => {
    const d = new Date(2026, 8, 15)
    const parsed = fromIsoMonthInput(toIsoMonthInput(d))!
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(8)
  })
})

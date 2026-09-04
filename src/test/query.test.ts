import { describe, it, expect } from 'vitest'
import { runQuery, buildSuggestions } from '../lib/query'
import { getCurrentRange, addDays } from '../lib/dates'
import type { ActivityRecord } from '../lib/types'

function makeRecord(overrides: Partial<ActivityRecord> & { id: string }): ActivityRecord {
  return {
    title: 'Test record',
    type: 'expense',
    originalText: 'test',
    lang: 'en',
    source: 'text',
    confirmed: true,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('runQuery', () => {
  it('filters by "today" / "leo"', () => {
    const todayTs = getCurrentRange('day').start.getTime() + 1000
    const yesterdayTs = getCurrentRange('day', addDays(new Date(), -1)).start.getTime() + 1000
    const records = [
      makeRecord({ id: 'a', createdAt: todayTs, item: 'diesel' }),
      makeRecord({ id: 'b', createdAt: yesterdayTs, item: 'cement' }),
    ]
    expect(runQuery('today', records).records.map(r => r.id)).toEqual(['a'])
    expect(runQuery('leo', records).records.map(r => r.id)).toEqual(['a'])
  })

  it('filters by "yesterday" / "jana"', () => {
    const todayTs = getCurrentRange('day').start.getTime() + 1000
    const yesterdayTs = getCurrentRange('day', addDays(new Date(), -1)).start.getTime() + 1000
    const records = [
      makeRecord({ id: 'a', createdAt: todayTs }),
      makeRecord({ id: 'b', createdAt: yesterdayTs }),
    ]
    expect(runQuery('jana', records).records.map(r => r.id)).toEqual(['b'])
  })

  it('combines a date phrase with a keyword', () => {
    const todayTs = getCurrentRange('day').start.getTime() + 1000
    const records = [
      makeRecord({ id: 'a', createdAt: todayTs, item: 'diesel' }),
      makeRecord({ id: 'b', createdAt: todayTs, item: 'cement' }),
    ]
    expect(runQuery('diesel today', records).records.map(r => r.id)).toEqual(['a'])
  })

  it('computes avg buy vs sell price for a buy/sell question, not a hallucinated number', () => {
    const todayTs = getCurrentRange('day').start.getTime() + 1000
    const records = [
      makeRecord({ id: 'a', type: 'expense', amount: 280_000, createdAt: todayTs }),
      makeRecord({ id: 'b', type: 'income', amount: 310_000, createdAt: todayTs }),
    ]
    const result = runQuery('nilinunua kwa bei gani leo na kuuza kwa bei gani', records)
    expect(result.answer).toBeDefined()
    const buy = result.answer!.find(a => a.labelKey === 'avgBuyPrice')!
    const sell = result.answer!.find(a => a.labelKey === 'avgSellPrice')!
    expect(buy.value).toContain('280,000')
    expect(sell.value).toContain('310,000')
  })

  it('falls back to plain keyword search when no date phrase is present', () => {
    const records = [
      makeRecord({ id: 'a', person: 'John', createdAt: Date.now() }),
      makeRecord({ id: 'b', person: 'Mary', createdAt: Date.now() }),
    ]
    expect(runQuery('john', records).records.map(r => r.id)).toEqual(['a'])
  })
})

describe('buildSuggestions', () => {
  it('only suggests real people/items that exist in the data', () => {
    const records = [
      makeRecord({ id: 'a', person: 'Juma', item: 'diesel', createdAt: Date.now() }),
      makeRecord({ id: 'b', person: 'Juma', item: 'diesel', createdAt: Date.now() }),
    ]
    const suggestions = buildSuggestions(records)
    const literals = suggestions.filter(s => s.kind === 'literal').map(s => (s as any).value)
    expect(literals).toContain('Juma')
    expect(literals).toContain('diesel')
    expect(literals).not.toContain('John')
  })

  it('still offers working time-based suggestions with zero records', () => {
    const suggestions = buildSuggestions([])
    expect(suggestions.some(s => s.kind === 'today')).toBe(true)
    expect(suggestions.some(s => s.kind === 'thisWeek')).toBe(true)
  })
})

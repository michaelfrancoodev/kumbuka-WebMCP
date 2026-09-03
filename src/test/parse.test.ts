import { describe, it, expect } from 'vitest'
import { parseSentence } from '../lib/parse'

describe('parseSentence', () => {
  it('detects an expense with digit amount and person', () => {
    const d = parseSentence('Nimempa John 5000 kwa diesel')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(5000)
    expect(d.person).toBe('John')
    expect(d.item).toBe('diesel')
  })

  it('detects income with English keywords', () => {
    const d = parseSentence('Received 20000 from Mary for gold')
    expect(d.type).toBe('income')
    expect(d.amount).toBe(20000)
    expect(d.person).toBe('Mary')
  })

  it('parses k-suffixed shorthand amounts', () => {
    const d = parseSentence('Paid 5k to Peter')
    expect(d.amount).toBe(5000)
  })

  it('parses elfu (thousand) suffix', () => {
    const d = parseSentence('nimelipa 2 elfu kwa mafuta')
    expect(d.amount).toBe(2000)
  })

  it('falls back to activity type with no money keywords', () => {
    const d = parseSentence('Tumepakia mchanga leo asubuhi')
    expect(d.type).toBe('activity')
  })

  it('flags missing fields', () => {
    const d = parseSentence('nimelipa')
    expect(d.missing).toContain('amount')
  })
})

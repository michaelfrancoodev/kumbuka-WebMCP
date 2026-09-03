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

  it('parses "laki tatu" as 300,000', () => {
    const d = parseSentence('Nimeuza dhahabu kwa shilingi laki tatu')
    expect(d.amount).toBe(300_000)
  })

  it('parses digit-string amounts after laki ("laki mbili nane" -> 280,000)', () => {
    const d = parseSentence('Nimeuza dhahabu kwa shilingi laki mbili nane')
    expect(d.amount).toBe(280_000)
  })

  it('recovers from the ASR mishearing "laki" as "lucky"', () => {
    // Real reported bug: speech recognition transcribed "laki" as "lucky",
    // which previously caused the amount to be parsed as 10 instead of 280,000.
    const d = parseSentence('leo nimeuza dhahabu kwa tanzania shilling lucky mbili nane')
    expect(d.amount).toBe(280_000)
    expect(d.type).toBe('income')
  })

  it('parses compound numerals with tens after a scale word ("elfu kumi na tano" -> 15,000)', () => {
    const d = parseSentence('nimelipa elfu kumi na tano kwa mafuta')
    expect(d.amount).toBe(15_000)
  })

  it('keeps a lone spoken digit as a small number, not a scaled amount', () => {
    const d = parseSentence('nimebeba magunia tatu ya saruji')
    expect(d.amount).toBe(3)
  })

  it('never alters the original raw narration, even when amount parsing normalizes it internally', () => {
    const raw = 'leo nimeuza dhahabu kwa tanzania shilling lucky mbili nane'
    const d = parseSentence(raw)
    expect(d.originalText).toBe(raw)
  })

  it('generates a short structured title instead of reusing the raw text', () => {
    const d = parseSentence('Nimempa John 5000 kwa diesel')
    expect(d.title).not.toBe(d.originalText)
    expect(d.title.toLowerCase()).toContain('john')
    expect(d.title).toContain('5,000')
  })
})

import { describe, it, expect } from 'vitest'
import { parseSentence, generateTitle } from '../lib/parse'

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

  it('sums two scale terms stated together ("laki mbili na elfu ishirini na nane" -> 228,000)', () => {
    const d = parseSentence('Nimenunua dhahabu kwa shilingi laki mbili na elfu ishirini na nane')
    expect(d.amount).toBe(228_000)
  })

  it('does not mistake a currency/country word for a person name', () => {
    const d = parseSentence('nimenunua dhahabu kwa tanzania shilingi laki mbili')
    expect(d.person).toBeUndefined()
  })

  it('does not mistake "kila" (each/every) for a person name', () => {
    const d = parseSentence('nikauza kila gramu kwa tanzania shilingi laki tatu')
    expect(d.person).toBeUndefined()
  })

  it('flags a sentence describing two transactions as "other" instead of guessing one side', () => {
    const d = parseSentence(
      'leo nimenunua dhahabu gramu kumi kwa tanzania shilingi laki mbili na elfu ishirini na nane kwa kila gramu na nikauza kila gramu kwa tanzania shilingi laki tatu na elfu kumi',
    )
    expect(d.type).toBe('other')
    // Amount should reflect only the first-mentioned transaction (the
    // purchase), not a meaningless sum of the buy and sell prices.
    expect(d.amount).toBe(228_000)
  })

  it('generates a Swahili title for a Swahili sentence regardless of app language toggle', () => {
    const d = parseSentence('Nimempa John elfu tano kwa diesel')
    expect(generateTitle(d, d.originalText)).toContain('kwa')
    expect(generateTitle(d, d.originalText)).not.toMatch(/paid to/i)
  })

  it('generates an English title for an English sentence', () => {
    const d = parseSentence('Received 20000 from Mary for gold')
    expect(generateTitle(d, d.originalText)).toMatch(/Mary/i)
    expect(generateTitle(d, d.originalText)).not.toMatch(/kwa|imeuzwa/i)
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

  // --- Mining-site activity coverage: food, worker loans, water, rentals ---
  // These cover the everyday cash movements around a small-scale mining
  // site (e.g. Geita) that aren't the ore/dhahabu transaction itself:
  // selling food to workers, lending money to a worker, buying/selling
  // water, paying casual labor, and renting equipment out.

  it('detects lending money to a worker as an expense (cash out)', () => {
    const d = parseSentence('Nimemkopesha John elfu tano')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(5000)
    expect(d.person).toBe('John')
  })

  it('detects a loan being repaid to the operator as income (cash in)', () => {
    const d = parseSentence('Amenirudishia deni yake elfu tano')
    expect(d.type).toBe('income')
    expect(d.amount).toBe(5000)
    expect(d.item).toBe('deni')
  })

  it('detects selling water as income with "maji" as the item', () => {
    const d = parseSentence('Nimeuza maji kwa Fatuma elfu mbili')
    expect(d.type).toBe('income')
    expect(d.amount).toBe(2000)
    expect(d.person).toBe('Fatuma')
    expect(d.item).toBe('maji')
  })

  it('detects buying water as an expense with "maji" as the item', () => {
    const d = parseSentence('Nimenunua maji kwa John elfu tatu')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(3000)
    expect(d.item).toBe('maji')
  })

  it('detects selling food to workers as an expense (site buying food for the crew)', () => {
    const d = parseSentence('Nimenunua chakula kwa wafanyakazi elfu kumi')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(10000)
    expect(d.item).toBe('chakula')
  })

  it('detects paying casual labor (kibarua) as an expense', () => {
    const d = parseSentence('Nimewalipa wafanyakazi elfu ishirini kwa kibarua')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(20000)
    expect(d.item).toBe('kibarua')
  })

  it('detects renting equipment out as income, not "other" (no false double-transaction)', () => {
    const d = parseSentence('Nimekodisha lori kwa siku tatu shilingi laki moja')
    expect(d.type).toBe('income')
    expect(d.amount).toBe(100_000)
    expect(d.item).toBe('lori')
  })

  it('does not let a longer keyword falsely trigger a shorter one that is its prefix ("nimekodisha" vs "nimekodi")', () => {
    const d = parseSentence('Nimekodisha pikipiki kwa siku mbili elfu kumi')
    expect(d.type).toBe('income')
  })

  it('does not let two overlapping keyword matches at the same position be mistaken for two transactions', () => {
    const d = parseSentence('I paid workers 20000 for the day')
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(20000)
  })

  it('detects borrowing money as income (cash coming into the site)', () => {
    const d = parseSentence('Nimekopa laki moja kwa Halima')
    expect(d.type).toBe('income')
    expect(d.amount).toBe(100_000)
    expect(d.person).toBe('Halima')
  })

  it('generates a Swahili title for money-movement sentences without the older core verbs (repayment, rental)', () => {
    const d = parseSentence('Amenirudishia deni yake elfu tano')
    expect(generateTitle(d, d.originalText)).not.toMatch(/paid|sold|payment/i)
  })
})

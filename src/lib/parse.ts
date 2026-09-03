import type { ParsedDraft, RecordType } from './types'

const EXPENSE_KEYWORDS = [
  'nimempa', 'nimemlipa', 'nililipa', 'nimenunua', 'nimetumia', 'gharama', 'nimelipa', 'nimetoa',
  'paid', 'spent', 'bought', 'gave', 'purchase', 'purchased', 'cost', 'expense',
]

const INCOME_KEYWORDS = [
  'nimepokea', 'amenilipa', 'nimeuza', 'nimepata', 'mapato', 'niliuza', 'alinilipa',
  'received', 'earned', 'sold', 'income', 'got paid', 'payment received',
]

const UNIT_WORDS = [
  'kg', 'kilo', 'kilos', 'kilogram', 'kilograms',
  'tani', 'ton', 'tons', 'tonne', 'tonnes',
  'mfuko', 'mifuko', 'bag', 'bags',
  'lita', 'liters', 'litres', 'litre', 'liter',
  'ndoo', 'bucket', 'buckets',
  'gunia', 'gunias',
  'saa', 'hours', 'hour',
  'siku', 'days', 'day',
]

const ITEM_HINTS = [
  'mchanga', 'dhahabu', 'gold', 'mawe', 'stones', 'ore',
  'saruji', 'cement', 'mafuta', 'diesel', 'petroli', 'petrol', 'fuel',
  'chakula', 'food', 'maji', 'water', 'chumvi', 'sukari', 'sugar',
  'vifaa', 'equipment', 'tools', 'zana', 'gari', 'lori', 'truck', 'lorry',
]

// Small Swahili word-number map, enough for common spoken amounts.
const SW_UNITS: Record<string, number> = {
  sifuri: 0, moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5,
  sita: 6, saba: 7, nane: 8, tisa: 9, kumi: 10,
}
// Single-digit words only (0-9). Used to detect "digit-string" readings like
// "laki mbili nane" (2, 8 read as consecutive digits -> 280,000), which
// miners commonly use for large sums instead of full compound numerals.
// Deliberately excludes "kumi" (10), which isn't a single digit.
const SW_DIGIT_ONLY: Record<string, number> = {
  sifuri: 0, moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5,
  sita: 6, saba: 7, nane: 8, tisa: 9,
}
const SW_TENS: Record<string, number> = {
  ishirini: 20, thelathini: 30, arobaini: 40, hamsini: 50,
  sitini: 60, sabini: 70, themanini: 80, tisini: 90,
}
const SW_SCALES: Record<string, number> = {
  elfu: 1_000, laki: 100_000, milioni: 1_000_000, million: 1_000_000,
}

// Common speech-recognition mishearings of Swahili number words (the ASR
// engine's language model leans English, so "laki" often comes back as an
// English homophone like "lucky"). Normalize these before parsing amounts
// so a mistranscribed "laki" doesn't silently disappear from the sentence.
const ASR_NUMBER_ALIASES: Array<[RegExp, string]> = [
  [/\b(lucky|lackey|lacky)\b/gi, 'laki'],
]

function normalizeAsrNumberQuirks(text: string): string {
  let out = text
  for (const [pattern, replacement] of ASR_NUMBER_ALIASES) out = out.replace(pattern, replacement)
  return out
}

// Places a sequence of single digits starting at `scale`'s order of
// magnitude, one decimal place lower per subsequent digit.
// e.g. digits [2, 8] with scale 100_000 (laki) -> 200,000 + 80,000 = 280,000
function digitRunValue(digits: number[], scale: number): number {
  let total = 0
  let place = scale
  for (const d of digits) {
    total += d * place
    place = place / 10
  }
  return total
}

function wordsToNumber(rawText: string): number | undefined {
  const text = normalizeAsrNumberQuirks(rawText)
  const tokens = text.toLowerCase().split(/\s+/).map(t => t.replace(/[.,]/g, ''))

  const scaleIdx = tokens.findIndex(t => SW_SCALES[t] !== undefined)

  if (scaleIdx !== -1) {
    const scale = SW_SCALES[tokens[scaleIdx]]

    // Digit-string reading: a run of single-digit words right after the
    // scale word ("laki mbili nane" -> 2, 8 -> 280,000). Covers the
    // single-digit case too ("laki tatu" -> 300,000).
    const run: number[] = []
    for (let i = scaleIdx + 1; i < tokens.length; i++) {
      const digit = SW_DIGIT_ONLY[tokens[i]]
      if (digit === undefined) break
      run.push(digit)
    }
    if (run.length >= 1) return digitRunValue(run, scale)

    // Fallback: compound numerals that include tens/"kumi" ("elfu kumi na
    // tano" -> 15,000) use the older additive-then-multiply reading.
    let base: number | undefined
    for (const tok of tokens) {
      if (SW_TENS[tok] !== undefined) base = (base ?? 0) + SW_TENS[tok]
      else if (SW_UNITS[tok] !== undefined) base = (base ?? 0) + SW_UNITS[tok]
    }
    return (base ?? 1) * scale
  }

  // No explicit scale word: a run of 2+ contiguous single-digit words is
  // read as a digit string against an implicit "laki" (hundred-thousand)
  // leading place, matching how amounts are spoken in the field
  // ("mbili nane" -> 280,000). A single lone digit stays a plain number
  // (e.g. "tatu" -> 3), since that's far more likely to be a small quantity.
  for (let i = 0; i < tokens.length; i++) {
    if (SW_DIGIT_ONLY[tokens[i]] === undefined) continue
    const run: number[] = []
    let j = i
    while (j < tokens.length && SW_DIGIT_ONLY[tokens[j]] !== undefined) { run.push(SW_DIGIT_ONLY[tokens[j]]); j++ }
    if (run.length >= 2) return digitRunValue(run, 100_000)
    i = j - 1
  }

  let base: number | undefined
  for (const tok of tokens) {
    if (SW_TENS[tok] !== undefined) base = (base ?? 0) + SW_TENS[tok]
    else if (SW_UNITS[tok] !== undefined) base = (base ?? 0) + SW_UNITS[tok]
  }
  return base
}

function parseAmount(text: string): number | undefined {
  // 1) "5k" / "5.5k" shorthand — the suffix letter is directly attached to the digits,
  //    so a word boundary after it is enough to avoid matching unrelated words.
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) return parseFloat(kMatch[1]) * 1_000

  // 2) Digits followed by a separate scale word (mandatory space + word boundary,
  //    so "5000 kwa diesel" does NOT mistake "kwa" for the "k" suffix).
  const scaleMatch = text.match(/(\d[\d,]*\.?\d*)\s+(elfu|laki|milioni|million)\b/i)
  if (scaleMatch) {
    const raw = parseFloat(scaleMatch[1].replace(/,/g, ''))
    if (!Number.isNaN(raw)) {
      const word = scaleMatch[2].toLowerCase()
      const multiplier = word === 'elfu' ? 1_000 : word === 'laki' ? 100_000 : 1_000_000
      return raw * multiplier
    }
  }

  // 3) Plain digits with no scale word.
  const plainMatch = text.match(/\d[\d,]*\.?\d*/)
  if (plainMatch) {
    const raw = parseFloat(plainMatch[0].replace(/,/g, ''))
    if (!Number.isNaN(raw)) return raw
  }

  // 4) Spelled-out Swahili numbers ("elfu tano" -> 5000)
  const worded = wordsToNumber(text)
  if (worded) return worded

  return undefined
}

function detectType(text: string): RecordType {
  const lower = text.toLowerCase()
  if (EXPENSE_KEYWORDS.some(k => lower.includes(k))) return 'expense'
  if (INCOME_KEYWORDS.some(k => lower.includes(k))) return 'income'
  return 'activity'
}

function detectUnit(text: string): string | undefined {
  const lower = text.toLowerCase()
  return UNIT_WORDS.find(u => new RegExp(`\\b${u}\\b`, 'i').test(lower))
}

function detectItem(text: string): string | undefined {
  const lower = text.toLowerCase()
  return ITEM_HINTS.find(i => lower.includes(i))
}

function detectPerson(text: string): string | undefined {
  // Look for a capitalized token that isn't the first word of the sentence
  // (mid-sentence capitals are usually names in both EN and SW voice transcripts).
  const words = text.split(/\s+/)
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[.,!?]/g, '')
    if (/^[A-Z][a-z]+$/.test(w) && !UNIT_WORDS.includes(w.toLowerCase())) {
      return w
    }
  }
  // Fallback: word right after "kwa" / "to" / "na"
  const prepMatch = text.match(/\b(?:kwa|to|na)\s+([A-Za-z]+)/i)
  if (prepMatch) return prepMatch[1]
  return undefined
}

export function parseSentence(text: string): ParsedDraft {
  const trimmed = text.trim()
  const type = detectType(trimmed)
  const amount = parseAmount(trimmed)
  const unit = detectUnit(trimmed)
  const item = detectItem(trimmed)
  const person = detectPerson(trimmed)

  const missing: ParsedDraft['missing'] = []
  if (amount === undefined && type !== 'activity') missing.push('amount')
  if (person === undefined && type !== 'activity') missing.push('person')
  if (item === undefined) missing.push('item')

  return {
    type,
    person,
    amount,
    item,
    unit,
    note: trimmed,
    // Raw narration, verbatim, untouched — this is what "view original
    // record" always shows, regardless of how parsing normalized it.
    originalText: trimmed,
    missing,
    title: generateTitle({ type, person, amount, item, unit }, trimmed),
  }
}

// Short, human-scannable title generated from the structured extraction —
// never the raw sentence itself. Falls back gracefully as fields go missing.
export function generateTitle(
  draft: { type: RecordType; person?: string; amount?: number; item?: string; unit?: string },
  fallbackText: string,
): string {
  const { type, person, amount, item, unit } = draft
  const amountStr = amount !== undefined ? `TSh ${amount.toLocaleString('en-US')}` : undefined
  const itemStr = item ? capitalize(item) : undefined
  const qty = unit ? unit : undefined

  if (type === 'expense') {
    if (itemStr && person) return `${itemStr} paid to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    if (itemStr) return `Paid for ${itemStr}${amountStr ? ` — ${amountStr}` : ''}`
    if (person) return `Payment to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    return amountStr ? `Expense — ${amountStr}` : 'Expense recorded'
  }
  if (type === 'income') {
    if (itemStr && person) return `${itemStr} sold to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    if (itemStr) return `Sold ${itemStr}${amountStr ? ` — ${amountStr}` : ''}`
    if (person) return `Payment from ${person}${amountStr ? ` — ${amountStr}` : ''}`
    return amountStr ? `Income — ${amountStr}` : 'Income recorded'
  }
  if (type === 'activity') {
    if (itemStr && qty) return `${capitalize(qty)} of ${itemStr}`
    if (itemStr) return `Activity — ${itemStr}`
    return truncate(fallbackText, 42) || 'Activity logged'
  }
  return itemStr ? `Record — ${itemStr}` : truncate(fallbackText, 42) || 'Record saved'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function truncate(s: string, max: number): string {
  const clean = s.trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + '…'
}

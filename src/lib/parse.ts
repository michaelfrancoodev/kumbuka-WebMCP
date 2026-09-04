import type { ParsedDraft, RecordType } from './types'

const EXPENSE_KEYWORDS = [
  'nimempa', 'nimemlipa', 'nililipa', 'nimenunua', 'nimetumia', 'gharama', 'nimelipa', 'nimetoa',
  'nikanunua', 'nikalipa', 'nikampa', 'ninanunua', 'ninalipa',
  'paid', 'spent', 'bought', 'gave', 'purchase', 'purchased', 'cost', 'expense',
]

const INCOME_KEYWORDS = [
  'nimepokea', 'amenilipa', 'nimeuza', 'nimepata', 'mapato', 'niliuza', 'alinilipa',
  'nikauza', 'nikapokea', 'ninauza',
  'received', 'earned', 'sold', 'income', 'got paid', 'payment received',
]

const UNIT_WORDS = [
  'kg', 'kilo', 'kilos', 'kilogram', 'kilograms',
  'gramu', 'gram', 'grams',
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

// Words that legitimately follow "kwa"/"na"/"to" in a sentence but are
// never themselves a person's name — currency, country/region names, and
// generic nouns. Without this, "kwa tanzania shilingi..." was being
// misread as a person named "Tanzania". Kept separate from ITEM_HINTS/
// UNIT_WORDS/number words below, which are already excluded structurally.
const NON_PERSON_WORDS = [
  'tanzania', 'tsh', 'shilingi', 'shillingi', 'shilling', 'fedha', 'pesa',
  'dola', 'dollar', 'dollars', 'euro', 'kenya', 'uganda', 'rwanda',
  'burundi', 'congo', 'zambia', 'malawi', 'msumbiji', 'mozambique',
  'kila', 'yote', 'wote', 'hivyo', 'hiyo', 'huyo', 'yeye', 'sisi', 'wewe',
  'mimi', 'wao', 'gramu', 'kilo', 'kila', 'leo', 'jana', 'kesho',
]

// Minimal signal for "which language was this sentence spoken/typed in" —
// used only to pick which language to render the generated title in, so a
// Swahili narration doesn't come back with an English title (or vice
// versa) regardless of what the app's UI toggle currently happens to be.
const SW_SIGNAL_WORDS = [
  'na', 'ya', 'wa', 'kwa', 'ni', 'za', 'la', 'cha', 'vya', 'kila', 'leo',
  'jana', 'kesho', 'shilingi', 'gramu', 'nimempa', 'nimemlipa', 'nililipa',
  'nimenunua', 'nimetumia', 'nimelipa', 'nimetoa', 'nimepokea', 'amenilipa',
  'nimeuza', 'nimepata', 'mapato', 'niliuza', 'alinilipa', 'nikauza',
  'nikanunua', 'nikalipa', 'nikampa', 'nikapokea',
]

function detectLanguage(text: string): 'sw' | 'en' {
  const tokens = text.toLowerCase().split(/\s+/).map(t => t.replace(/[.,!?]/g, ''))
  return tokens.some(t => SW_SIGNAL_WORDS.includes(t)) ? 'sw' : 'en'
}

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

// Computes the value of one "SCALE_WORD ...trailing number words..." chunk,
// e.g. tokens=['mbili'] scale=100_000 -> 200_000 (digit-string reading),
// or tokens=['kumi','tano'] scale=1_000 -> 15_000 (additive tens/units
// reading). Tries the digit-string reading first since it's unambiguous
// only when it actually matches consecutive single digits; falls back to
// additive tens+units otherwise.
function computeScaleChunk(tokensAfterScale: string[], scale: number): number {
  const run: number[] = []
  for (const tok of tokensAfterScale) {
    const digit = SW_DIGIT_ONLY[tok]
    if (digit === undefined) break
    run.push(digit)
  }
  if (run.length >= 1) return digitRunValue(run, scale)

  let base: number | undefined
  for (const tok of tokensAfterScale) {
    if (SW_TENS[tok] !== undefined) base = (base ?? 0) + SW_TENS[tok]
    else if (SW_UNITS[tok] !== undefined) base = (base ?? 0) + SW_UNITS[tok]
  }
  return (base ?? 1) * scale
}

function wordsToNumber(rawText: string): number | undefined {
  const text = normalizeAsrNumberQuirks(rawText)
  const tokens = text.toLowerCase().split(/\s+/).map(t => t.replace(/[.,]/g, ''))

  const scaleIdxs: number[] = []
  tokens.forEach((t, i) => { if (SW_SCALES[t] !== undefined) scaleIdxs.push(i) })

  if (scaleIdxs.length > 0) {
    // Sum every "SCALE_WORD ...trailing number words..." chunk found in the
    // text. This covers not just a single scale word, but compound sums
    // stated as two scale terms in one breath — e.g. "laki mbili na elfu
    // ishirini na nane" (200,000 + 28,000 = 228,000), a very common way of
    // stating large amounts in the field that a single-scale reading used
    // to silently truncate to just the first term (200,000).
    let total = 0
    for (let c = 0; c < scaleIdxs.length; c++) {
      const idx = scaleIdxs[c]
      const nextIdx = scaleIdxs[c + 1] ?? tokens.length
      const scale = SW_SCALES[tokens[idx]]
      const chunkTokens = tokens.slice(idx + 1, nextIdx).filter(t => t !== 'na')
      total += computeScaleChunk(chunkTokens, scale)
    }
    return total
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

// When a sentence describes more than one transaction ("nimenunua ... na
// nikauza ..."), an amount/scale word can appear on both sides. Scope
// amount parsing to the first-mentioned transaction's clause only, so a
// buy price and a sell price don't get summed together into a number
// that means nothing.
function firstTransactionClause(text: string): string {
  const lower = text.toLowerCase()
  const positions: number[] = []
  for (const kw of [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS]) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(lower))) positions.push(m.index)
  }
  positions.sort((a, b) => a - b)
  if (positions.length < 2) return text
  return text.slice(0, positions[1]).trim()
}

function parseAmount(text: string): number | undefined {
  const scoped = firstTransactionClause(text)

  // 1) "5k" / "5.5k" shorthand — the suffix letter is directly attached to the digits,
  //    so a word boundary after it is enough to avoid matching unrelated words.
  const kMatch = scoped.match(/(\d+(?:\.\d+)?)\s*k\b/i)
  if (kMatch) return parseFloat(kMatch[1]) * 1_000

  // 2) Digits followed by a separate scale word (mandatory space + word boundary,
  //    so "5000 kwa diesel" does NOT mistake "kwa" for the "k" suffix).
  const scaleMatch = scoped.match(/(\d[\d,]*\.?\d*)\s+(elfu|laki|milioni|million)\b/i)
  if (scaleMatch) {
    const raw = parseFloat(scaleMatch[1].replace(/,/g, ''))
    if (!Number.isNaN(raw)) {
      const word = scaleMatch[2].toLowerCase()
      const multiplier = word === 'elfu' ? 1_000 : word === 'laki' ? 100_000 : 1_000_000
      return raw * multiplier
    }
  }

  // 3) Plain digits with no scale word.
  const plainMatch = scoped.match(/\d[\d,]*\.?\d*/)
  if (plainMatch) {
    const raw = parseFloat(plainMatch[0].replace(/,/g, ''))
    if (!Number.isNaN(raw)) return raw
  }

  // 4) Spelled-out Swahili numbers ("elfu tano" -> 5000)
  const worded = wordsToNumber(scoped)
  if (worded) return worded

  return undefined
}

function detectType(text: string): RecordType {
  const lower = text.toLowerCase()
  const isExpense = EXPENSE_KEYWORDS.some(k => lower.includes(k))
  const isIncome = INCOME_KEYWORDS.some(k => lower.includes(k))
  // A sentence can genuinely describe two transactions at once ("nimenunua
  // ... na nikauza ..." — bought at one price, sold at another). Silently
  // picking one side and labeling it "expense" produces a confidently
  // wrong record. Be honest about it instead: 'other' with the full
  // sentence kept as the title (see generateTitle) rather than a
  // one-sided amount/person that doesn't represent what was said.
  if (isExpense && isIncome) return 'other'
  if (isExpense) return 'expense'
  if (isIncome) return 'income'
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
    if (/^[A-Z][a-z]+$/.test(w) && !UNIT_WORDS.includes(w.toLowerCase()) && !NON_PERSON_WORDS.includes(w.toLowerCase())) {
      return w
    }
  }
  // Fallback: word right after "kwa" / "to" / "na" — but only ever a
  // plausible name, never a currency, country, unit, item, or number word
  // that just happens to sit in that slot (e.g. "kwa tanzania shilingi...").
  const prepMatches = text.matchAll(/\b(?:kwa|to|na)\s+([A-Za-z]+)/gi)
  for (const m of prepMatches) {
    const candidate = m[1]
    const lower = candidate.toLowerCase()
    if (
      NON_PERSON_WORDS.includes(lower) ||
      UNIT_WORDS.includes(lower) ||
      ITEM_HINTS.includes(lower) ||
      SW_SCALES[lower] !== undefined ||
      SW_TENS[lower] !== undefined ||
      SW_UNITS[lower] !== undefined ||
      EXPENSE_KEYWORDS.includes(lower) ||
      INCOME_KEYWORDS.includes(lower)
    ) {
      continue
    }
    return candidate
  }
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
// Renders in whichever language the sentence itself was spoken/typed in
// (auto-detected from the text), not the app's UI toggle — a Swahili
// narration should always get a Swahili title, regardless of what language
// the rest of the screen happens to be in at that moment.
export function generateTitle(
  draft: { type: RecordType; person?: string; amount?: number; item?: string; unit?: string },
  fallbackText: string,
): string {
  const { type, person, amount, item, unit } = draft
  const lang = detectLanguage(fallbackText)
  const amountStr = amount !== undefined ? `TSh ${amount.toLocaleString('en-US')}` : undefined
  const itemStr = item ? capitalize(item) : undefined
  const qty = unit ? unit : undefined

  if (type === 'expense') {
    if (lang === 'sw') {
      if (itemStr && person) return `${itemStr} kwa ${person}${amountStr ? ` — ${amountStr}` : ''}`
      if (itemStr) return `Malipo ya ${itemStr}${amountStr ? ` — ${amountStr}` : ''}`
      if (person) return `Malipo kwa ${person}${amountStr ? ` — ${amountStr}` : ''}`
      return amountStr ? `Matumizi — ${amountStr}` : 'Matumizi yamerekodiwa'
    }
    if (itemStr && person) return `${itemStr} paid to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    if (itemStr) return `Paid for ${itemStr}${amountStr ? ` — ${amountStr}` : ''}`
    if (person) return `Payment to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    return amountStr ? `Expense — ${amountStr}` : 'Expense recorded'
  }
  if (type === 'income') {
    if (lang === 'sw') {
      if (itemStr && person) return `${itemStr} imeuzwa kwa ${person}${amountStr ? ` — ${amountStr}` : ''}`
      if (itemStr) return `${itemStr} imeuzwa${amountStr ? ` — ${amountStr}` : ''}`
      if (person) return `Malipo kutoka kwa ${person}${amountStr ? ` — ${amountStr}` : ''}`
      return amountStr ? `Mapato — ${amountStr}` : 'Mapato yamerekodiwa'
    }
    if (itemStr && person) return `${itemStr} sold to ${person}${amountStr ? ` — ${amountStr}` : ''}`
    if (itemStr) return `Sold ${itemStr}${amountStr ? ` — ${amountStr}` : ''}`
    if (person) return `Payment from ${person}${amountStr ? ` — ${amountStr}` : ''}`
    return amountStr ? `Income — ${amountStr}` : 'Income recorded'
  }
  if (type === 'activity') {
    if (lang === 'sw') {
      if (itemStr && qty) return `${capitalize(qty)} za ${itemStr}`
      if (itemStr) return `Shughuli — ${itemStr}`
      return truncate(fallbackText, 60) || 'Shughuli imerekodiwa'
    }
    if (itemStr && qty) return `${capitalize(qty)} of ${itemStr}`
    if (itemStr) return `Activity — ${itemStr}`
    return truncate(fallbackText, 42) || 'Activity logged'
  }
  // 'other' — including sentences that describe more than one transaction
  // at once (e.g. a purchase and a sale in the same breath), where picking
  // a single type/amount/person would misrepresent what was actually said.
  // The full original sentence is the only honest title in that case.
  if (lang === 'sw') {
    return itemStr ? `Rekodi — ${itemStr}` : truncate(fallbackText, 60) || 'Rekodi imehifadhiwa'
  }
  return itemStr ? `Record — ${itemStr}` : truncate(fallbackText, 60) || 'Record saved'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function truncate(s: string, max: number): string {
  const clean = s.trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).trimEnd() + '…'
}

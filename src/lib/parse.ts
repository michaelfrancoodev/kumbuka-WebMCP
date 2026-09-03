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
const SW_TENS: Record<string, number> = {
  ishirini: 20, thelathini: 30, arobaini: 40, hamsini: 50,
  sitini: 60, sabini: 70, themanini: 80, tisini: 90,
}
const SW_SCALES: Record<string, number> = {
  elfu: 1_000, laki: 100_000, milioni: 1_000_000, million: 1_000_000,
}

function wordsToNumber(text: string): number | undefined {
  const tokens = text.toLowerCase().split(/\s+/)
  let base: number | undefined
  let scale: number | undefined

  for (const tok of tokens) {
    const clean = tok.replace(/[.,]/g, '')
    if (SW_SCALES[clean]) { scale = SW_SCALES[clean]; continue }
    if (SW_TENS[clean]) { base = (base ?? 0) + SW_TENS[clean]; continue }
    if (SW_UNITS[clean] !== undefined) { base = (base ?? 0) + SW_UNITS[clean]; continue }
  }

  if (base === undefined && scale === undefined) return undefined
  return (base ?? 1) * (scale ?? 1)
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
    originalText: trimmed,
    missing,
  }
}

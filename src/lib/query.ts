import { getCurrentRange, addDays } from './dates'
import type { ActivityRecord } from './types'

export interface DateMatch {
  start: number
  end: number
  labelKey: string
}

interface DatePhrase {
  patterns: RegExp[]
  labelKey: string
  resolve: () => { start: Date; end: Date }
}

// Recognized date-relative phrases, EN + SW. Checked longest/most-specific
// first so "this week" doesn't get shadowed by a looser pattern.
const DATE_PHRASES: DatePhrase[] = [
  {
    patterns: [/\bthis month\b/i, /\bmwezi huu\b/i],
    labelKey: 'thisMonth',
    resolve: () => { const r = getCurrentRange('month'); return { start: r.start, end: r.end } },
  },
  {
    patterns: [/\bthis week\b/i, /\bwiki hii\b/i],
    labelKey: 'thisWeek',
    resolve: () => { const r = getCurrentRange('week'); return { start: r.start, end: r.end } },
  },
  {
    patterns: [/\byesterday\b/i, /\bjana\b/i],
    labelKey: 'yesterday',
    resolve: () => { const r = getCurrentRange('day', addDays(new Date(), -1)); return { start: r.start, end: r.end } },
  },
  {
    patterns: [/\btoday\b/i, /\bleo\b/i],
    labelKey: 'today',
    resolve: () => { const r = getCurrentRange('day'); return { start: r.start, end: r.end } },
  },
]

const BUY_WORDS = ['nunua', 'nulinunua', 'nilinunua', 'bought', 'buy', 'kununua']
const SELL_WORDS = ['uza', 'niliuza', 'sold', 'sell', 'kuuza']

export interface QueryResult {
  records: ActivityRecord[]
  dateLabelKey?: string
  /** A directly computed answer (e.g. avg buy vs sell price) when the
   * question matches a recognizable pattern — never fabricated, always
   * derived from the records actually returned. */
  answer?: { labelKey: string; value: string }[]
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

// Turns a free-text question into a filtered, date-aware record set, plus a
// computed answer for common "how much did I buy/sell for" style questions —
// never a hallucinated answer, always aggregated from the matched records.
export function runQuery(query: string, records: ActivityRecord[]): QueryResult {
  const q = query.trim().toLowerCase()
  if (!q) return { records: [] }

  let dateLabelKey: string | undefined
  let pool = records
  let remainder = q

  for (const phrase of DATE_PHRASES) {
    const hit = phrase.patterns.find(p => p.test(remainder))
    if (hit) {
      const { start, end } = phrase.resolve()
      pool = pool.filter(r => r.createdAt >= start.getTime() && r.createdAt <= end.getTime())
      dateLabelKey = phrase.labelKey
      remainder = remainder.replace(hit, ' ').trim()
      break
    }
  }

  const mentionsBuy = BUY_WORDS.some(w => remainder.includes(w))
  const mentionsSell = SELL_WORDS.some(w => remainder.includes(w))

  // Strip recognized keywords out of the remainder before using it as a
  // free-text match, so "bei gani jana" doesn't need "bei gani" to appear
  // verbatim in the note.
  const stripWords = [...BUY_WORDS, ...SELL_WORDS, 'bei', 'gani', 'na', 'kwa', 'what', 'did', 'i', 'price']
  const keywordRemainder = remainder
    .split(/\s+/)
    .filter(w => w && !stripWords.includes(w))
    .join(' ')
    .trim()

  const keywordMatches = keywordRemainder
    ? pool.filter(r =>
        r.originalText.toLowerCase().includes(keywordRemainder) ||
        r.person?.toLowerCase().includes(keywordRemainder) ||
        r.item?.toLowerCase().includes(keywordRemainder) ||
        r.type.toLowerCase().includes(keywordRemainder),
      )
    : pool

  const finalRecords = (keywordRemainder ? keywordMatches : pool).sort((a, b) => b.createdAt - a.createdAt)

  const result: QueryResult = { records: finalRecords, dateLabelKey }

  if (mentionsBuy && mentionsSell) {
    const buys = finalRecords.filter(r => r.type === 'expense' && r.amount !== undefined).map(r => r.amount!)
    const sells = finalRecords.filter(r => r.type === 'income' && r.amount !== undefined).map(r => r.amount!)
    if (buys.length || sells.length) {
      result.answer = [
        { labelKey: 'avgBuyPrice', value: buys.length ? `TSh ${Math.round(avg(buys)).toLocaleString('en-US')}` : '—' },
        { labelKey: 'avgSellPrice', value: sells.length ? `TSh ${Math.round(avg(sells)).toLocaleString('en-US')}` : '—' },
      ]
    }
  }

  return result
}

// Builds real, working suggestion chips from the user's own data instead of
// fixed example text — a name/item that doesn't exist in any record is
// useless as a suggestion, so we only ever suggest values that will
// actually return something.
export type Suggestion = { kind: 'literal'; value: string } | { kind: 'today' } | { kind: 'thisWeek' }

export function buildSuggestions(records: ActivityRecord[]): Suggestion[] {
  const suggestions: Suggestion[] = []

  const personCounts = new Map<string, number>()
  const itemCounts = new Map<string, number>()
  for (const r of records) {
    if (r.person) personCounts.set(r.person, (personCounts.get(r.person) || 0) + 1)
    if (r.item) itemCounts.set(r.item, (itemCounts.get(r.item) || 0) + 1)
  }
  const topPerson = [...personCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  if (topPerson) suggestions.push({ kind: 'literal', value: topPerson })
  if (topItem) suggestions.push({ kind: 'literal', value: topItem })
  suggestions.push({ kind: 'today' })
  suggestions.push({ kind: 'thisWeek' })

  return suggestions.slice(0, 4)
}

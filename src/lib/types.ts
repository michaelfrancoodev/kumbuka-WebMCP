export type RecordType = 'expense' | 'income' | 'activity' | 'other'
export type Source = 'voice' | 'text' | 'agent'
export type Lang = 'en' | 'sw'

export interface ActivityRecord {
  id: string
  title: string
  type: RecordType
  person?: string
  amount?: number
  item?: string
  unit?: string
  note?: string
  originalText: string
  lang: Lang
  source: Source
  confirmed: boolean
  createdAt: number
}

export interface ParsedDraft {
  type: RecordType
  person?: string
  amount?: number
  item?: string
  unit?: string
  note?: string
  originalText: string
  missing: Array<'amount' | 'person' | 'item'>
  title: string
}

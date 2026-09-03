import { db, saveRecord, deleteRecord, getAllRecords, getRecordsByDateRange } from './db'
import { getCurrentRange, type RangeType } from './dates'
import { isWebMCPAvailable } from './webmcp'
import type { ActivityRecord, RecordType } from './types'

function newId(): string {
  return crypto.randomUUID()
}

const RECORD_TYPES: RecordType[] = ['expense', 'income', 'activity', 'other']

/**
 * Registers Kumbuka's WebMCP tools so an AI agent sharing the browser tab
 * can read and write the same activity log the human operator sees —
 * without guessing at buttons or scraping the DOM.
 */
export function registerWebMCPTools(): void {
  if (!isWebMCPAvailable()) return
  const mc = navigator.modelContext
  if (!mc) return

  mc.registerTool({
    name: 'add_activity_record',
    description:
      'Add a new activity record to Kumbuka (a mining-site activity tracker). Use "expense" when money left the site (e.g. paying a worker or supplier), "income" when money came in (e.g. selling output), or "activity" for a general work log entry with no money attached.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: RECORD_TYPES, description: 'Kind of record: expense, income, activity, or other.' },
        person: { type: 'string', description: 'Person involved, if any (payer, payee, worker name).' },
        amount: { type: 'number', description: 'Amount of money in Tanzanian Shillings (TSh), if applicable.' },
        item: { type: 'string', description: 'Item, goods, or task the record refers to (e.g. "diesel", "cement", "loading truck").' },
        unit: { type: 'string', description: 'Unit for the item quantity, if any (e.g. "bags", "liters", "kg").' },
        note: { type: 'string', description: 'Free-text note or extra detail about the record.' },
      },
      required: ['type'],
    },
    execute: async (args) => {
      const type = (RECORD_TYPES.includes(args.type as RecordType) ? args.type : 'activity') as RecordType
      const record: ActivityRecord = {
        id: newId(),
        type,
        person: args.person as string | undefined,
        amount: typeof args.amount === 'number' ? args.amount : undefined,
        item: args.item as string | undefined,
        unit: args.unit as string | undefined,
        note: args.note as string | undefined,
        originalText: (args.note as string) || (args.item as string) || `${type} record added by agent`,
        lang: 'en',
        source: 'agent',
        confirmed: true,
        createdAt: Date.now(),
      }
      await saveRecord(record)
      return { success: true, id: record.id, record }
    },
  })

  mc.registerTool({
    name: 'list_activity_records',
    description: 'List Kumbuka activity records, optionally filtered by type, person, or a date range (unix ms timestamps).',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: RECORD_TYPES },
        person: { type: 'string', description: 'Filter by person name (partial match, case-insensitive).' },
        startDate: { type: 'number', description: 'Unix ms timestamp for range start.' },
        endDate: { type: 'number', description: 'Unix ms timestamp for range end.' },
        limit: { type: 'number', description: 'Max number of records to return. Default 50.' },
      },
      required: [],
    },
    execute: async (args) => {
      let records =
        typeof args.startDate === 'number' && typeof args.endDate === 'number'
          ? await getRecordsByDateRange(args.startDate, args.endDate)
          : await getAllRecords()

      if (args.type) records = records.filter(r => r.type === args.type)
      if (args.person) {
        const q = (args.person as string).toLowerCase()
        records = records.filter(r => r.person?.toLowerCase().includes(q))
      }

      const limit = typeof args.limit === 'number' ? args.limit : 50
      return { count: records.length, records: records.slice(0, limit) }
    },
  })

  mc.registerTool({
    name: 'search_activity_records',
    description: 'Search Kumbuka records by keyword across the original text, person, item, and note fields. Useful for answering questions like "how much did we pay John" or "what happened last Tuesday".',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword or phrase to search for.' },
        limit: { type: 'number', description: 'Max number of matches to return. Default 20.' },
      },
      required: ['query'],
    },
    execute: async (args) => {
      const q = ((args.query as string) || '').toLowerCase()
      const all = await getAllRecords()
      const matches = all.filter(r =>
        r.originalText.toLowerCase().includes(q) ||
        r.person?.toLowerCase().includes(q) ||
        r.item?.toLowerCase().includes(q) ||
        r.note?.toLowerCase().includes(q),
      )
      const limit = typeof args.limit === 'number' ? args.limit : 20
      return { count: matches.length, records: matches.slice(0, limit) }
    },
  })

  mc.registerTool({
    name: 'get_summary_report',
    description: 'Get a financial and activity summary for a time range: total money out, total money in, balance, record counts by type, and totals by person.',
    inputSchema: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['day', 'week', 'month'], description: 'Reporting period, relative to today. Default "week".' },
      },
      required: [],
    },
    execute: async (args) => {
      const rangeType = ((args.range as RangeType) || 'week') as RangeType
      const range = getCurrentRange(rangeType)
      const records = await getRecordsByDateRange(range.start.getTime(), range.end.getTime())

      const totalOut = records.filter(r => r.type === 'expense').reduce((s, r) => s + (r.amount || 0), 0)
      const totalIn = records.filter(r => r.type === 'income').reduce((s, r) => s + (r.amount || 0), 0)

      const byType: Record<string, number> = {}
      const byPerson: Record<string, number> = {}
      for (const r of records) {
        byType[r.type] = (byType[r.type] || 0) + 1
        if (r.person && r.amount) byPerson[r.person] = (byPerson[r.person] || 0) + r.amount
      }

      return {
        range: range.label,
        sublabel: range.sublabel,
        recordCount: records.length,
        totalOut,
        totalIn,
        balance: totalIn - totalOut,
        byType,
        byPerson,
      }
    },
  })

  mc.registerTool({
    name: 'delete_activity_record',
    description: 'Delete a Kumbuka activity record by its id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'The record id to delete.' } },
      required: ['id'],
    },
    execute: async (args) => {
      const id = args.id as string
      await deleteRecord(id)
      return { success: true, id }
    },
  })

  // Expose db directly for debugging/dev only; not part of the tool surface.
  void db
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerWebMCPTools } from '../lib/webmcp-register'
import { db } from '../lib/db'

type Tool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

function installFakeModelContext() {
  const tools = new Map<string, Tool>()
  ;(globalThis as any).navigator.modelContext = {
    registerTool: (tool: Tool) => tools.set(tool.name, tool),
  }
  return tools
}

describe('WebMCP tool registration', () => {
  let tools: Map<string, Tool>

  beforeEach(async () => {
    await db.records.clear()
    tools = installFakeModelContext()
    registerWebMCPTools()
  })

  it('registers all five Kumbuka tools with valid schemas', () => {
    const expected = [
      'add_activity_record',
      'list_activity_records',
      'search_activity_records',
      'get_summary_report',
      'delete_activity_record',
    ]
    for (const name of expected) {
      expect(tools.has(name)).toBe(true)
      const tool = tools.get(name)!
      expect(tool.description.length).toBeGreaterThan(10)
      expect(tool.inputSchema).toHaveProperty('type', 'object')
      expect(typeof tool.execute).toBe('function')
    }
  })

  it('does nothing if WebMCP is unavailable', () => {
    delete (globalThis as any).navigator.modelContext
    const spy = vi.fn()
    ;(globalThis as any).navigator.modelContext = undefined
    expect(() => registerWebMCPTools()).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
  })

  it('add_activity_record persists a record an agent can then find', async () => {
    const add = tools.get('add_activity_record')!
    const result: any = await add.execute({ type: 'expense', person: 'Grace', amount: 15000, item: 'cement' })
    expect(result.success).toBe(true)
    expect(result.record.source).toBe('agent')

    const all = await db.records.toArray()
    expect(all.length).toBe(1)
    expect(all[0].person).toBe('Grace')
    expect(all[0].amount).toBe(15000)
  })

  it('list_activity_records filters by type and person', async () => {
    const add = tools.get('add_activity_record')!
    await add.execute({ type: 'expense', person: 'Grace', amount: 15000 })
    await add.execute({ type: 'income', person: 'Peter', amount: 8000 })

    const list = tools.get('list_activity_records')!
    const expensesOnly: any = await list.execute({ type: 'expense' })
    expect(expensesOnly.count).toBe(1)
    expect(expensesOnly.records[0].person).toBe('Grace')

    const peterOnly: any = await list.execute({ person: 'pet' })
    expect(peterOnly.count).toBe(1)
    expect(peterOnly.records[0].person).toBe('Peter')
  })

  it('search_activity_records finds matches by keyword across fields', async () => {
    const add = tools.get('add_activity_record')!
    await add.execute({ type: 'expense', person: 'Grace', amount: 15000, item: 'cement', note: 'bags of cement for foundation' })

    const search = tools.get('search_activity_records')!
    const result: any = await search.execute({ query: 'cement' })
    expect(result.count).toBe(1)
  })

  it('get_summary_report totals income, expenses, and balance correctly', async () => {
    const add = tools.get('add_activity_record')!
    await add.execute({ type: 'expense', amount: 10000 })
    await add.execute({ type: 'expense', amount: 5000 })
    await add.execute({ type: 'income', amount: 30000 })

    const summary = tools.get('get_summary_report')!
    const report: any = await summary.execute({ range: 'week' })
    expect(report.totalOut).toBe(15000)
    expect(report.totalIn).toBe(30000)
    expect(report.balance).toBe(15000)
    expect(report.recordCount).toBe(3)
  })

  it('delete_activity_record removes the record', async () => {
    const add = tools.get('add_activity_record')!
    const added: any = await add.execute({ type: 'activity', item: 'loaded truck' })

    const del = tools.get('delete_activity_record')!
    const result: any = await del.execute({ id: added.id })
    expect(result.success).toBe(true)

    const all = await db.records.toArray()
    expect(all.length).toBe(0)
  })
})

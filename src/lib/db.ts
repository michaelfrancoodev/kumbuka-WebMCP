import Dexie, { type Table } from 'dexie'
import type { ActivityRecord } from './types'

class KumbukaDB extends Dexie {
  records!: Table<ActivityRecord, string>

  constructor() {
    super('kumbuka-db')
    this.version(1).stores({
      records: 'id, type, person, createdAt, confirmed',
    })
  }
}

export const db = new KumbukaDB()

let tokenStore = new Map<string, number>()

export function issueConfirmToken(recordId: string): string {
  const token = crypto.randomUUID() + '-' + Date.now().toString(36)
  tokenStore.set(token, Date.now() + 2 * 60 * 1000)
  return token
}

export function commitDraft(token: string): boolean {
  const expiry = tokenStore.get(token)
  if (!expiry || Date.now() > expiry) {
    tokenStore.delete(token)
    return false
  }
  tokenStore.delete(token)
  return true
}

export async function saveRecord(record: ActivityRecord): Promise<void> {
  await db.records.put(record)
}

export async function deleteRecord(id: string): Promise<void> {
  await db.records.delete(id)
}

export async function getAllRecords(): Promise<ActivityRecord[]> {
  return db.records.orderBy('createdAt').reverse().toArray()
}

export async function getRecordsByDateRange(start: number, end: number): Promise<ActivityRecord[]> {
  return db.records.where('createdAt').between(start, end, true, true).reverse().toArray()
}

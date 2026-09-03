import { useLiveQuery } from 'dexie-react-hooks'
import { db, getAllRecords, saveRecord, deleteRecord } from '../lib/db'
import type { ActivityRecord } from '../lib/types'

export function useRecords() {
  const records = useLiveQuery(() => getAllRecords(), [], [] as ActivityRecord[])
  const loading = records === undefined

  const add = async (record: ActivityRecord) => { await saveRecord(record) }
  const remove = async (id: string) => { await deleteRecord(id) }
  const clearAll = async () => { await db.records.clear() }

  return { records: records ?? [], loading, add, remove, clearAll }
}

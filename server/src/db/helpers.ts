import type Database from 'better-sqlite3'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function getRow<T extends Row>(stmt: Database.Statement, ...params: unknown[]): T | undefined {
  return stmt.get(...params) as T | undefined
}

export function allRows<T extends Row>(stmt: Database.Statement, ...params: unknown[]): T[] {
  return stmt.all(...params) as T[]
}

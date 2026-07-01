import { describe, it, expect, beforeEach } from 'vitest'
import db from '../db/index.js'
import { initDB } from '../db/index.js'
import { getSetting, setSetting, getAllSettings } from './settings.service.js'

initDB()

describe('settings.service', () => {
  beforeEach(() => {
    db.exec('DELETE FROM settings')
    db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_requires_verification', 'true')")
    db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('qq_registration_enabled', 'false')")
  })

  it('getSetting returns undefined for missing key', () => {
    expect(getSetting('nonexistent')).toBeUndefined()
  })

  it('getSetting returns default value', () => {
    expect(getSetting('registration_requires_verification')).toBe('true')
  })

  it('setSetting inserts new setting', () => {
    setSetting('my_key', 'my_val')
    expect(getSetting('my_key')).toBe('my_val')
  })

  it('setSetting updates existing setting', () => {
    setSetting('registration_requires_verification', 'false')
    expect(getSetting('registration_requires_verification')).toBe('false')
  })

  it('setSetting updates updated_at', () => {
    setSetting('registration_requires_verification', 'false')
    const row = db.prepare('SELECT updated_at FROM settings WHERE key = ?').get('registration_requires_verification') as { updated_at: string }
    expect(row.updated_at).toBeTruthy()
  })

  it('getAllSettings returns all settings', () => {
    const all = getAllSettings()
    expect(all.registration_requires_verification).toBe('true')
    expect(all.qq_registration_enabled).toBe('false')
  })

  it('getAllSettings reflects updates', () => {
    setSetting('registration_requires_verification', 'false')
    const all = getAllSettings()
    expect(all.registration_requires_verification).toBe('false')
  })
})

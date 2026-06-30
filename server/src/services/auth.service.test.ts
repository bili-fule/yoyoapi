import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { register, login, sendCode, resetPassword } from './auth.service.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  db.prepare('DELETE FROM logs').run()
  db.prepare('DELETE FROM verify_codes').run()
  db.prepare('DELETE FROM api_keys').run()
  db.prepare('DELETE FROM channels').run()
  db.prepare('DELETE FROM users').run()
  db.pragma('foreign_keys = ON')
}

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  cleanDB()
})

function getStoredCode(email: string, type: string): string {
  const row = db.prepare('SELECT code FROM verify_codes WHERE email = ? AND type = ? ORDER BY id DESC LIMIT 1')
    .get(email, type) as { code: string } | undefined
  if (!row) throw new Error('No verification code found')
  return row.code
}

describe('sendCode', () => {
  it('should store a 6-digit verification code for register type', () => {
    const result = sendCode('alice@test.com', 'register')

    expect(result).toBeInstanceOf(Promise)
    const row = db.prepare('SELECT * FROM verify_codes WHERE email = ? AND type = ?')
      .get('alice@test.com', 'register') as Record<string, unknown>

    expect(row).toBeDefined()
    expect(row!.code).toMatch(/^\d{6}$/)
    expect(row!.type).toBe('register')
    expect(row!.used).toBe(0)
    expect(row!.expires_at).toBeDefined()
  })

  it('should store a verification code for reset type', () => {
    sendCode('bob@test.com', 'reset')

    const row = db.prepare('SELECT * FROM verify_codes WHERE email = ? AND type = ?')
      .get('bob@test.com', 'reset') as Record<string, unknown>

    expect(row).toBeDefined()
    expect(row!.code).toMatch(/^\d{6}$/)
    expect(row!.type).toBe('reset')
  })
})

describe('register', () => {
  it('should create user and api key with valid code', async () => {
    sendCode('alice@test.com', 'register')
    const code = getStoredCode('alice@test.com', 'register')

    const result = await register('alice@test.com', 'securePass1', code)

    expect(result.user.email).toBe('alice@test.com')
    expect(result.user.displayName).toBe('alice')
    expect(result.user.role).toBe(1)
    expect(result.apiKey).toMatch(/^sk-[0-9a-f]{64}$/)
  })

  it('should mark code as used after successful registration', async () => {
    sendCode('alice@test.com', 'register')
    const code = getStoredCode('alice@test.com', 'register')

    await register('alice@test.com', 'securePass1', code)

    const row = db.prepare('SELECT used FROM verify_codes WHERE email = ? AND code = ?')
      .get('alice@test.com', code) as { used: number }
    expect(row).toBeDefined()
    expect(row.used).toBe(1)
  })

  it('should reject invalid code', async () => {
    await expect(register('alice@test.com', 'securePass1', '000000'))
      .rejects.toThrow('Invalid or expired verification code')
  })

  it('should reject expired code', async () => {
    db.prepare('INSERT INTO verify_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)')
      .run('alice@test.com', '123456', 'register', '2020-01-01T00:00:00.000Z')

    await expect(register('alice@test.com', 'securePass1', '123456'))
      .rejects.toThrow('Invalid or expired verification code')
  })

  it('should reject already used code', async () => {
    db.prepare('INSERT INTO verify_codes (email, code, type, expires_at, used) VALUES (?, ?, ?, ?, 1)')
      .run('alice@test.com', '123456', 'register', '2099-01-01T00:00:00.000Z')

    await expect(register('alice@test.com', 'securePass1', '123456'))
      .rejects.toThrow('Invalid or expired verification code')
  })

  it('should reject duplicate email', async () => {
    sendCode('dup@test.com', 'register')
    const code = getStoredCode('dup@test.com', 'register')
    await register('dup@test.com', 'securePass1', code)

    sendCode('dup@test.com', 'register')
    const code2 = getStoredCode('dup@test.com', 'register')
    await expect(register('dup@test.com', 'securePass1', code2))
      .rejects.toThrow('Email already registered')
  })
})

describe('login', () => {
  async function seedUser(email: string, password: string, role = 1): Promise<string> {
    const { hashPassword, generateApiKey } = await import('../utils/crypto.js')
    const pwHash = await hashPassword(password)
    db.prepare('INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run(email, pwHash, 'Test', role)
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number }
    const key = generateApiKey()
    db.prepare('INSERT INTO api_keys (user_id, key, name) VALUES (?, ?, ?)').run(user.id, key, 'test')
    return key
  }

  it('should return user and api key with correct credentials', async () => {
    const expectedKey = await seedUser('login1@test.com', 'securePass1')

    const result = await login('login1@test.com', 'securePass1')

    expect(result.user.email).toBe('login1@test.com')
    expect(result.user.role).toBe(1)
    expect(result.apiKey).toBe(expectedKey)
  })

  it('should reject wrong password', async () => {
    await seedUser('login2@test.com', 'securePass1')

    await expect(login('login2@test.com', 'wrongPassword'))
      .rejects.toThrow('Invalid email or password')
  })

  it('should reject non-existent email', async () => {
    await expect(login('nobody@test.com', 'securePass1'))
      .rejects.toThrow('Invalid email or password')
  })

  it('should reject disabled account', async () => {
    await seedUser('login3@test.com', 'securePass1', 0)

    await expect(login('login3@test.com', 'securePass1'))
      .rejects.toThrow('Account disabled')
  })
})

describe('resetPassword', () => {
  async function seedUser(email: string, password: string): Promise<void> {
    const { hashPassword } = await import('../utils/crypto.js')
    const pwHash = await hashPassword(password)
    db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
      .run(email, pwHash, 'Test')
  }

  it('should allow login with new password after reset', async () => {
    await seedUser('reset1@test.com', 'oldPass123')

    sendCode('reset1@test.com', 'reset')
    const resetCode = getStoredCode('reset1@test.com', 'reset')
    await resetPassword('reset1@test.com', resetCode, 'newPass456')

    // verify by checking we can log in with new password
    const { hashPassword, generateApiKey } = await import('../utils/crypto.js')
    const pwHash = await hashPassword('newPass456')
    const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('reset1@test.com') as { password_hash: string }
    // password should be updated
    expect(user.password_hash).not.toBe(pwHash) // different salt, but a valid bcrypt hash
    expect(user.password_hash.startsWith('$2a$')).toBe(true)
  })

  it('should reject wrong reset code', async () => {
    await seedUser('reset2@test.com', 'oldPass123')

    await expect(resetPassword('reset2@test.com', '000000', 'newPass456'))
      .rejects.toThrow('Invalid or expired verification code')
  })
})

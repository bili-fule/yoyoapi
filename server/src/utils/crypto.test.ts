import { hashPassword, verifyPassword, generateCode, generateApiKey } from './crypto.js'

describe('hashPassword / verifyPassword', () => {
  it('should hash and verify a password correctly', async () => {
    const password = 'my-secret-password-123'
    const hash = await hashPassword(password)
    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.startsWith('$2a$')).toBe(true)

    const valid = await verifyPassword(password, hash)
    expect(valid).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const valid = await verifyPassword('wrong-password', hash)
    expect(valid).toBe(false)
  })
})

describe('generateCode', () => {
  it('should generate a code with default length 6', () => {
    const code = generateCode()
    expect(code.length).toBe(6)
  })

  it('should generate a code with custom length', () => {
    const code = generateCode(8)
    expect(code.length).toBe(8)
  })

  it('should contain only digits', () => {
    const code = generateCode(100)
    expect(code).toMatch(/^\d+$/)
  })
})

describe('generateApiKey', () => {
  it('should start with sk-', () => {
    const key = generateApiKey()
    expect(key.startsWith('sk-')).toBe(true)
  })

  it('should have 67 characters (sk- + 64 hex)', () => {
    const key = generateApiKey()
    expect(key.length).toBe(67)
  })

  it('should contain only hex chars after sk-', () => {
    const key = generateApiKey()
    const hexPart = key.slice(3)
    expect(hexPart).toMatch(/^[0-9a-f]{64}$/)
  })
})

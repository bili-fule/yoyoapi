import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateCode(length = 6): string {
  const chars = '0123456789'
  let code = ''
  const bytes = randomBytes(length)
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i]! % chars.length]
  }
  return code
}

export function generateApiKey(): string {
  const bytes = randomBytes(32)
  return 'sk-' + bytes.toString('hex')
}

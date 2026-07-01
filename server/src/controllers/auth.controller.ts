import type { Request, Response } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.service.js'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().length(6).optional(),
  displayName: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const sendCodeSchema = z.object({
  email: z.string().email(),
  type: z.enum(['register', 'reset']),
})

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6),
})

export async function register(req: Request, res: Response): Promise<void> {
  const data = registerSchema.parse(req.body)
  const result = await authService.register(data.email, data.password, data.code, data.displayName)
  res.status(201).json(result)
}

export async function login(req: Request, res: Response): Promise<void> {
  const data = loginSchema.parse(req.body)
  const result = await authService.login(data.email, data.password)
  res.json(result)
}

export async function sendCode(req: Request, res: Response): Promise<void> {
  const data = sendCodeSchema.parse(req.body)
  const ok = await authService.sendCode(data.email, data.type)
  if (!ok) {
    res.status(500).json({ error: { message: 'Failed to send verification code' } })
    return
  }
  res.json({ message: 'Verification code sent' })
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const data = resetPasswordSchema.parse(req.body)
  await authService.resetPassword(data.email, data.code, data.newPassword)
  res.json({ message: 'Password reset successfully' })
}

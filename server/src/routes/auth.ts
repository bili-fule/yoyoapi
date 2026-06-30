import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { rateLimit } from '../middleware/rate-limit.js'

const router = Router()

const wrap = (fn: Function) => (...args: any[]) => Promise.resolve(fn(...args)).catch(args[2])

router.post('/register', rateLimit(5, 60_000), wrap(authController.register))
router.post('/login', rateLimit(10, 60_000), wrap(authController.login))
router.post('/send-code', rateLimit(3, 60_000), wrap(authController.sendCode))
router.post('/reset-password', rateLimit(5, 60_000), wrap(authController.resetPassword))

export default router

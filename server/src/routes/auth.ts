import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import * as qqRegisterController from '../controllers/qq-register.controller.js'
import { rateLimit } from '../middleware/rate-limit.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.post('/register', rateLimit(5, 60_000), asyncHandler(authController.register))
router.post('/login', rateLimit(10, 60_000), asyncHandler(authController.login))
router.post('/send-code', rateLimit(3, 60_000), asyncHandler(authController.sendCode))
router.post('/reset-password', rateLimit(5, 60_000), asyncHandler(authController.resetPassword))

router.post('/qq-register-code', rateLimit(5, 60_000), asyncHandler(qqRegisterController.qqRegisterCode))
router.post('/register-qq', rateLimit(5, 60_000), asyncHandler(qqRegisterController.registerQq))

export default router

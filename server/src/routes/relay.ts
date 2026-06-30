import { Router } from 'express'
import * as relayController from '../controllers/relay.controller.js'
import { tokenAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.post('/chat/completions', tokenAuth, rateLimit(30, 60_000), asyncHandler(relayController.chatCompletion))
router.get('/models', tokenAuth, rateLimit(60, 60_000), relayController.listModels)

export default router

import { Router } from 'express'
import * as relayController from '../controllers/relay.controller.js'
import { tokenAuth } from '../middleware/auth.js'

const router = Router()

const wrap = (fn: Function) => (...args: any[]) => Promise.resolve(fn(...args)).catch(args[2])

router.post('/chat/completions', tokenAuth, wrap(relayController.chatCompletion))
router.get('/models', tokenAuth, relayController.listModels)

export default router

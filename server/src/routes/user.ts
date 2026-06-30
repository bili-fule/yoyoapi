import { Router } from 'express'
import * as userController from '../controllers/user.controller.js'
import * as qqController from '../controllers/qq.controller.js'
import { tokenAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'

const router = Router()

router.use(tokenAuth)

router.get('/profile', userController.getProfile)
router.put('/profile', userController.updateProfile)
router.get('/api-keys', userController.listMyApiKeys)
router.post('/api-keys', userController.createApiKeyHandler)
router.put('/api-keys/:id', userController.updateApiKeyHandler)
router.delete('/api-keys/:id', userController.deleteApiKeyHandler)

router.get('/bind/qq/code', rateLimit(5, 60_000), qqController.getBindCode)
router.post('/bind/qq', rateLimit(5, 60_000), qqController.confirmBind)
router.delete('/bind/qq', qqController.unbindQq)

export default router

import { Router } from 'express'
import * as userController from '../controllers/user.controller.js'
import { tokenAuth } from '../middleware/auth.js'

const router = Router()

router.use(tokenAuth)

router.get('/profile', userController.getProfile)
router.put('/profile', userController.updateProfile)
router.get('/api-keys', userController.listMyApiKeys)
router.post('/api-keys', userController.createApiKeyHandler)
router.put('/api-keys/:id', userController.updateApiKeyHandler)
router.delete('/api-keys/:id', userController.deleteApiKeyHandler)

export default router

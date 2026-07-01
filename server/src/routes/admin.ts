import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { tokenAuth, adminAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()

router.use(tokenAuth, adminAuth)

router.get('/users', adminController.listUsers)
router.put('/users/:id', adminController.updateUser)
router.delete('/users/:id', adminController.deleteUser)

router.get('/channels', adminController.listChannels)
router.post('/channels', adminController.createChannel)
router.put('/channels/:id', adminController.updateChannel)
router.delete('/channels/:id', adminController.deleteChannel)

router.post('/channels/fetch-models', asyncHandler(adminController.fetchModels))

router.get('/logs', adminController.getLogs)
router.get('/stats', adminController.getStats)
router.get('/settings', adminController.getSettings)
router.put('/settings', adminController.updateSetting)

export default router

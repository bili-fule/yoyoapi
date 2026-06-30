import { Router } from 'express'
import authRoutes from './auth.js'
import userRoutes from './user.js'
import relayRoutes from './relay.js'
import adminRoutes from './admin.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/user', userRoutes)
router.use('/v1', relayRoutes)
router.use('/admin', adminRoutes)

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router

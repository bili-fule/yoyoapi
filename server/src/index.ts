import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import { initDB } from './db/index.js'
import { errorHandler } from './middleware/error.js'
import routes from './routes/index.js'
import { hashPassword } from './utils/crypto.js'
import { startCleanup } from './db/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

initDB()

const app = express()

app.set('trust proxy', 1)
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: config.corsOrigin }))
app.use(morgan('short'))
app.use(express.json({ limit: '10mb' }))

app.use('/api', routes)

if (config.serveStatic) {
  const webBuildPath = resolve(__dirname, '..', '..', 'web', 'build')
  app.use(express.static(webBuildPath))
  app.get('*', (_req, res) => {
    res.sendFile(resolve(webBuildPath, 'index.html'))
  })
}

app.use(errorHandler)

async function bootstrap(): Promise<void> {
  const db = (await import('./db/index.js')).default

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(config.admin.email)
  if (!existing) {
    const passwordHash = await hashPassword(config.admin.password)
    db.prepare(`
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES (?, ?, ?, 10)
    `).run(config.admin.email, passwordHash, 'Admin')
    console.log(`Admin user created: ${config.admin.email}`)
  }

  startCleanup()

  app.listen(config.port, config.host, () => {
    console.log(`Server running on http://${config.host}:${config.port}`)
  })
}

bootstrap().catch(console.error)

export default app

import express from 'express'
import request from 'supertest'
import { rateLimit } from './rate-limit.js'
import { errorHandler } from './error.js'

let app: express.Express

describe('rateLimit', () => {
  beforeAll(() => {
    app = express()
    app.set('trust proxy', true)
    app.get('/test-rate', rateLimit(2, 1000), (_req, res) => {
      res.json({ ok: true })
    })
    app.use(errorHandler)
  })

  it('should allow requests within limit', async () => {
    const ip = '1.2.3.4'

    const res1 = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res1.status).toBe(200)

    const res2 = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res2.status).toBe(200)
  })

  it('should block requests exceeding limit', async () => {
    const ip = '2.3.4.5'

    const res1 = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res1.status).toBe(200)

    const res2 = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res2.status).toBe(200)

    const res3 = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res3.status).toBe(429)
    expect(res3.body.error.code).toBe('rate_limit')
  })

  it('should reset window after expiry', async () => {
    const ip = '3.4.5.6'

    await request(app).get('/test-rate').set('X-Forwarded-For', ip)
    await request(app).get('/test-rate').set('X-Forwarded-For', ip)
    await request(app).get('/test-rate').set('X-Forwarded-For', ip).expect(429)

    await new Promise(resolve => setTimeout(resolve, 1100))

    const res = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip)
    expect(res.status).toBe(200)
  }, 10000)

  it('should track different IPs separately', async () => {
    const ip1 = '10.0.0.1'
    const ip2 = '10.0.0.2'

    await request(app).get('/test-rate').set('X-Forwarded-For', ip1)
    await request(app).get('/test-rate').set('X-Forwarded-For', ip1)

    await request(app).get('/test-rate').set('X-Forwarded-For', ip1).expect(429)

    const res = await request(app)
      .get('/test-rate')
      .set('X-Forwarded-For', ip2)
    expect(res.status).toBe(200)
  })
})

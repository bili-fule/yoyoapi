import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { relayChatCompletion } from './relay.service.js'
import type { OpenAIRequest } from '../converters/types.js'
import { AuthError } from '../utils/errors.js'

beforeAll(() => {
  initDB()
})

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  for (const t of ['logs', 'verify_codes', 'api_keys', 'channels', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
}

let userCounter = 0

function seedUser(overrides: Partial<{ quota: number; used_quota: number }> = {}): number {
  userCounter++
  const email = `relaytest${userCounter}@test.com`
  db.prepare('INSERT INTO users (email, password_hash, quota, used_quota) VALUES (?, ?, ?, ?)')
    .run(email, 'hash', overrides.quota ?? 0, overrides.used_quota ?? 0)
  return (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number }).id
}

function seedChannel(): number {
  db.prepare('INSERT INTO channels (name, type, base_url, api_key, models, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run('relay-test', 'openai', 'https://api.test.com', 'sk-test', JSON.stringify(['*']), 1)
  return (db.prepare('SELECT id FROM channels WHERE name = ?').get('relay-test') as { id: number }).id
}

const sampleResponse = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: 1700000000,
  model: 'gpt-4o',
  choices: [{
    index: 0,
    message: { role: 'assistant', content: 'Hi!' },
    finish_reason: 'stop',
  }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
}

beforeEach(() => {
  cleanDB()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('relayChatCompletion', () => {
  it('relays non-streaming request and returns response with usage', async () => {
    const userId = seedUser()
    const channelId = seedChannel()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )

    expect('response' in result).toBe(true)
    if ('response' in result) {
      expect(result.response.choices[0]?.message.content).toBe('Hi!')
      expect(result.usage.promptTokens).toBe(10)
      expect(result.usage.completionTokens).toBe(5)
    }
  })

  it('throws on upstream error', async () => {
    const userId = seedUser()
    const channelId = seedChannel()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 }),
    )

    await expect(relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )).rejects.toThrow('Upstream error 400')
  })

  it('returns stream response for streaming request', async () => {
    const userId = seedUser()
    const channelId = seedChannel()

    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    )

    const result = await relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: true },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )

    expect('stream' in result).toBe(true)
    if ('stream' in result) {
      expect(result.stream).toBeInstanceOf(Response)
      expect(result.model).toBe('gpt-4o')
      expect(result.targetFormat).toBe('openai')
    }
  })

  it('allows request when quota is unlimited (quota=0)', async () => {
    const userId = seedUser({ quota: 0, used_quota: 0 })
    const channelId = seedChannel()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )

    expect('response' in result).toBe(true)
  })

  it('throws AuthError when quota is exceeded', async () => {
    const userId = seedUser({ quota: 100, used_quota: 100 })
    const channelId = seedChannel()

    await expect(relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )).rejects.toThrow(AuthError)
  })

  it('allows request when quota not exceeded', async () => {
    const userId = seedUser({ quota: 100, used_quota: 50 })
    const channelId = seedChannel()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )

    expect('response' in result).toBe(true)
  })

  it('increases used_quota after non-streaming relay', async () => {
    const userId = seedUser({ quota: 1000, used_quota: 0 })
    const channelId = seedChannel()

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(sampleResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )

    const user = db.prepare('SELECT used_quota FROM users WHERE id = ?').get(userId) as { used_quota: number }
    // quota_cost = prompt_tokens 10 + completion_tokens 5 * 3 = 25
    expect(user.used_quota).toBe(25)
  })

  it('throws Error when channel is disabled', async () => {
    const userId = seedUser()
    db.prepare('INSERT INTO channels (name, type, base_url, api_key, models, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run('relay-disabled', 'openai', 'https://api.test.com', 'sk-test', JSON.stringify(['*']), 0)
    const channelId = (db.prepare('SELECT id FROM channels WHERE name = ?').get('relay-disabled') as { id: number }).id

    await expect(relayChatCompletion(
      { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello' }], stream: false },
      { apiKeyId: 1, userId, targetFormat: 'openai', channelId, model: 'gpt-4o' },
    )).rejects.toThrow('Channel disabled')
  })
})

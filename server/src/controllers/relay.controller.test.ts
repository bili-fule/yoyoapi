import { initDB } from '../db/index.js'
import db from '../db/index.js'
import { chatCompletion, listModels } from './relay.controller.js'
import * as channelService from '../services/channel.service.js'
import * as relayService from '../services/relay.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import type { Response } from 'express'
import type { TargetFormat } from '../converters/types.js'

function cleanDB(): void {
  db.pragma('foreign_keys = OFF')
  for (const t of ['logs', 'verify_codes', 'api_keys', 'channels', 'users']) {
    db.prepare(`DELETE FROM ${t}`).run()
  }
  db.pragma('foreign_keys = ON')
}

const mockChannelRow = {
  id: 1,
  name: 'test-channel',
  type: 'openai',
  base_url: 'https://api.test.com',
  api_key: 'sk-test',
  models: JSON.stringify(['*']),
  priority: 1,
  status: 1,
  created_at: '2024-01-01 00:00:00',
}

function createMockReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    headers: {},
    body: {},
    user: { id: 1, email: 'test@test.com', role: 1, displayName: 'Test', quota: 0, usedQuota: 0, qqId: '' },
    apiKeyId: 1,
    ...overrides,
  } as AuthenticatedRequest
}

function createMockRes(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    flushHeaders: vi.fn(),
    end: vi.fn(),
    write: vi.fn().mockReturnThis(),
  }
  return res as Response
}

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  cleanDB()
  vi.restoreAllMocks()
})

// ─── chatCompletion ───────────────────────────────────────────────────────────

describe('chatCompletion', () => {
  it('returns 400 when model is missing', async () => {
    const req = createMockReq({ body: { messages: [] } })
    const res = createMockRes()

    await chatCompletion(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Model is required' } })
  })

  it('returns 503 when no enabled channels available', async () => {
    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([])
    const req = createMockReq({ body: { model: 'gpt-4', messages: [] } })
    const res = createMockRes()

    await chatCompletion(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'No available upstream channels' } })
  })

  it('returns 200 with response for successful non-streaming relay', async () => {
    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([mockChannelRow])
    const mockRelayResult = {
      response: {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
    }
    vi.spyOn(relayService, 'relayChatCompletion').mockResolvedValue(mockRelayResult)

    const req = createMockReq({ body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }] } })
    const res = createMockRes()

    await chatCompletion(req, res)

    expect(res.json).toHaveBeenCalledWith(mockRelayResult.response)
  })

  it('returns 502 when relay service throws an error', async () => {
    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([mockChannelRow])
    vi.spyOn(relayService, 'relayChatCompletion').mockRejectedValue(new Error('Upstream error 500'))

    const req = createMockReq({ body: { model: 'gpt-4', messages: [] } })
    const res = createMockRes()

    await chatCompletion(req, res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Upstream error 500' } })
  })

  it('streaming: sets SSE headers and processes stream', async () => {
    db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('stream@test.com', 'hash')
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('stream@test.com') as { id: number }

    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([mockChannelRow])

    const encoder = new TextEncoder()
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    const streamResult = {
      stream: new Response(mockStream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
      model: 'gpt-4',
      targetFormat: 'openai' as TargetFormat,
    }
    vi.spyOn(relayService, 'relayChatCompletion').mockResolvedValue(streamResult)

    const req = createMockReq({
      user: { id: user.id, email: 'stream@test.com', role: 1, displayName: 'Stream', quota: 0, usedQuota: 0, qqId: '' },
      body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }], stream: true },
    })
    const res = createMockRes()

    await chatCompletion(req, res)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache')
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive')
    expect(res.flushHeaders).toHaveBeenCalled()
    expect(res.write).toHaveBeenCalled()
    expect(res.end).toHaveBeenCalled()
  })
})

// ─── listModels ───────────────────────────────────────────────────────────────

describe('listModels', () => {
  it('returns unique model list from enabled channels', () => {
    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([
      { ...mockChannelRow, models: JSON.stringify(['gpt-4', 'gpt-3.5-turbo']) },
      { ...mockChannelRow, id: 2, models: JSON.stringify(['gpt-4', 'claude-3-opus']) },
    ])

    const req = createMockReq()
    const res = createMockRes()

    listModels(req, res)

    const callArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.object).toBe('list')
    expect(callArg.data).toHaveLength(3)
    const modelIds = callArg.data.map((m: { id: string }) => m.id).sort()
    expect(modelIds).toEqual(['claude-3-opus', 'gpt-3.5-turbo', 'gpt-4'])
    for (const model of callArg.data) {
      expect(model.object).toBe('model')
      expect(model.owned_by).toBe('yoyoapi')
    }
  })

  it('returns empty data list when no channels exist', () => {
    vi.spyOn(channelService, 'getEnabledChannelsByType').mockReturnValue([])

    const req = createMockReq()
    const res = createMockRes()

    listModels(req, res)

    const callArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.object).toBe('list')
    expect(callArg.data).toEqual([])
  })
})

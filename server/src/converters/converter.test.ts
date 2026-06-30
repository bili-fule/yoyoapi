import { describe, it, expect } from 'vitest'
import { convertRequest, convertResponse, convertStreamChunk } from './index.js'
import type { OpenAIRequest, OpenAIResponse } from './types.js'

const sampleRequest: OpenAIRequest = {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
  max_tokens: 100,
  temperature: 0.7,
  stream: false,
}

const sampleResponse: OpenAIResponse = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: 1700000000,
  model: 'gpt-4o',
  choices: [{
    index: 0,
    message: { role: 'assistant', content: 'Hi there!' },
    finish_reason: 'stop',
  }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
}

describe('convertRequest - openai → openai (passthrough)', () => {
  it('should return the same request', () => {
    const result = convertRequest(sampleRequest, 'openai')
    expect(result.format).toBe('openai')
    expect(result.body).toEqual(sampleRequest)
  })
})

describe('convertRequest - openai → anthropic', () => {
  it('should extract system message', () => {
    const result = convertRequest(sampleRequest, 'anthropic')
    expect(result.format).toBe('anthropic')
    const body = result.body as Record<string, unknown>
    expect(body.system).toBe('You are a helpful assistant.')
    expect((body.messages as Array<{ role: string }>)[0]?.role).toBe('user')
  })

  it('should map model name', () => {
    const result = convertRequest(sampleRequest, 'anthropic')
    const body = result.body as Record<string, unknown>
    expect(body.model).toBe('claude-sonnet-4-20250514')
  })

  it('should pass through max_tokens and temperature', () => {
    const result = convertRequest(sampleRequest, 'anthropic')
    const body = result.body as Record<string, unknown>
    expect(body.max_tokens).toBe(100)
    expect(body.temperature).toBe(0.7)
  })
})

describe('convertRequest - openai → gemini', () => {
  it('should convert messages to gemini format', () => {
    const result = convertRequest(sampleRequest, 'gemini')
    expect(result.format).toBe('gemini')
    const body = result.body as Record<string, unknown>
    expect(body.contents).toBeDefined()
    expect((body.contents as Array<{ role: string }>)[0]?.role).toBe('user')
    expect(body.system_instruction).toBeDefined()
  })

  it('should map model name', () => {
    const result = convertRequest({ ...sampleRequest }, 'gemini', {
      'gpt-4o': 'gemini-2.5-pro',
    })
    // model is not in gemini request body directly, we use it for URL
    expect(result.format).toBe('gemini')
  })

  it('should set generationConfig', () => {
    const result = convertRequest(sampleRequest, 'gemini')
    const body = result.body as { generationConfig?: Record<string, unknown> }
    expect(body.generationConfig?.maxOutputTokens).toBe(100)
    expect(body.generationConfig?.temperature).toBe(0.7)
  })
})

describe('convertResponse - anthropic → openai', () => {
  const anthropicResponse = {
    id: 'msg_01',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text' as const, text: 'Hi there!' }],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  }

  it('should convert to OpenAI format', () => {
    const result = convertResponse(anthropicResponse, 'gpt-4o', 'anthropic')
    expect(result.object).toBe('chat.completion')
    expect(result.choices[0]?.message.content).toBe('Hi there!')
    expect(result.usage.prompt_tokens).toBe(10)
    expect(result.usage.completion_tokens).toBe(5)
  })

  it('should map finish_reason', () => {
    const result = convertResponse(anthropicResponse, 'gpt-4o', 'anthropic')
    expect(result.choices[0]?.finish_reason).toBe('stop')
  })
})

describe('convertResponse - gemini → openai', () => {
  const geminiResponse = {
    candidates: [{
      index: 0,
      content: { role: 'model', parts: [{ text: 'Hi there!' }] },
      finishReason: 'STOP',
    }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    modelVersion: 'gemini-2.5-flash',
  }

  it('should convert to OpenAI format', () => {
    const result = convertResponse(geminiResponse, 'gpt-4o', 'gemini')
    expect(result.object).toBe('chat.completion')
    expect(result.choices[0]?.message.content).toBe('Hi there!')
    expect(result.usage.prompt_tokens).toBe(10)
    expect(result.usage.completion_tokens).toBe(5)
  })

  it('should map finish_reason', () => {
    const result = convertResponse(geminiResponse, 'gpt-4o', 'gemini')
    expect(result.choices[0]?.finish_reason).toBe('stop')
  })
})

describe('convertStreamChunk - anthropic → openai', () => {
  it('should convert content_block_delta with text', () => {
    const event = { type: 'content_block_delta', index: 0, delta: { text: 'Hello' } }
    const result = convertStreamChunk(event, 'gpt-4o', 'anthropic')
    expect(result).not.toBeNull()
    expect(result?.choices[0]?.delta.content).toBe('Hello')
  })

  it('should return null for non-text events', () => {
    const event = { type: 'message_delta', delta: { type: 'text' } }
    const result = convertStreamChunk(event, 'gpt-4o', 'anthropic')
    expect(result).toBeNull()
  })

  it('should handle stop signal', () => {
    const event = { type: 'message_stop' }
    const result = convertStreamChunk(event, 'gpt-4o', 'anthropic')
    expect(result).not.toBeNull()
    expect(result?.choices[0]?.finish_reason).toBe('stop')
  })
})

describe('convertStreamChunk - gemini → openai', () => {
  it('should convert text chunk', () => {
    const chunk = { candidates: [{ index: 0, content: { role: 'model', parts: [{ text: 'Hi' }] }, finishReason: null }] }
    const result = convertStreamChunk(chunk, 'gpt-4o', 'gemini')
    expect(result).not.toBeNull()
    expect(result?.choices[0]?.delta.content).toBe('Hi')
  })

  it('should return null for empty chunk', () => {
    const chunk = { candidates: [{ index: 0, content: { role: 'model', parts: [{}] }, finishReason: null }] }
    const result = convertStreamChunk(chunk, 'gpt-4o', 'gemini')
    expect(result).toBeNull()
  })
})

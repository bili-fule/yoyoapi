import type { OpenAIRequest, OpenAIResponse, OpenAIStreamChunk } from './types.js'

export function passthroughRequest(req: OpenAIRequest): OpenAIRequest {
  return { ...req }
}

export function toOpenAIResponse(
  body: unknown,
  model: string,
  usage?: { prompt_tokens: number; completion_tokens: number },
): OpenAIResponse {
  const u = usage ?? { prompt_tokens: 0, completion_tokens: 0 }
  const content = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: u.prompt_tokens,
      completion_tokens: u.completion_tokens,
      total_tokens: u.prompt_tokens + u.completion_tokens,
    },
  }
}

export function toOpenAIStreamChunk(
  content: string,
  model: string,
  index = 0,
  finish_reason: string | null = null,
): OpenAIStreamChunk {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index,
      delta: { content: content || null },
      finish_reason,
    }],
  }
}

export function formatStreamChunkSSE(chunk: OpenAIStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

export function formatDoneSSE(): string {
  return 'data: [DONE]\n\n'
}

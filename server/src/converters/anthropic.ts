import type {
  OpenAIRequest,
  OpenAIResponse,
  OpenAIStreamChunk,
  AnthropicRequest,
  AnthropicResponse,
  AnthropicStreamEvent,
  ModelMap,
} from './types.js'

const DEFAULT_MODEL_MAP: ModelMap = {
  'gpt-4o': 'claude-sonnet-4-20250514',
  'gpt-4o-mini': 'claude-haiku-3-5-sonnet-20241022',
  'gpt-4': 'claude-sonnet-4-20250514',
  'gpt-3.5-turbo': 'claude-haiku-3-5-sonnet-20241022',
  'deepseek-chat': 'claude-sonnet-4-20250514',
  'deepseek-v4': 'claude-sonnet-4-20250514',
}

export function openaiToAnthropicRequest(
  oaiReq: OpenAIRequest,
  modelMap?: ModelMap,
): AnthropicRequest {
  const map = modelMap ?? DEFAULT_MODEL_MAP
  const systemMsgs = oaiReq.messages.filter(m => m.role === 'system')
  const otherMsgs = oaiReq.messages.filter(m => m.role !== 'system')

  const system = systemMsgs.map(m => m.content ?? '').join('\n')

  const messages = otherMsgs.map(m => ({
    role: m.role === 'tool' ? 'assistant' as const : m.role as 'user' | 'assistant',
    content: m.content ?? '',
  }))

  return {
    model: map[oaiReq.model] ?? oaiReq.model,
    messages,
    ...(system ? { system } : {}),
    max_tokens: oaiReq.max_tokens ?? 4096,
    temperature: oaiReq.temperature,
    top_p: oaiReq.top_p,
    stream: oaiReq.stream,
    stop_sequences: oaiReq.stop ? (Array.isArray(oaiReq.stop) ? oaiReq.stop : [oaiReq.stop]) : undefined,
    tools: oaiReq.tools,
    tool_choice: oaiReq.tool_choice,
  }
}

export function anthropicToOpenAIResponse(
  anResp: AnthropicResponse,
  originalModel: string,
): OpenAIResponse {
  const text = anResp.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  return {
    id: anResp.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: originalModel,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text || null },
      finish_reason: anResp.stop_reason === 'end_turn' ? 'stop' : anResp.stop_reason,
    }],
    usage: {
      prompt_tokens: anResp.usage.input_tokens,
      completion_tokens: anResp.usage.output_tokens,
      total_tokens: anResp.usage.input_tokens + anResp.usage.output_tokens,
    },
  }
}

export function anthropicStreamToOpenAIChunk(
  event: AnthropicStreamEvent,
  model: string,
): OpenAIStreamChunk | null {
  if (event.type === 'content_block_delta' && event.delta?.text) {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: event.index ?? 0,
        delta: { content: event.delta.text },
        finish_reason: null,
      }],
    }
  }

  if (event.type === 'message_delta' && event.delta?.type === 'text') {
    return null
  }

  if (event.type === 'message_stop') {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        delta: { content: null },
        finish_reason: 'stop',
      }],
    }
  }

  return null
}

import type {
  OpenAIRequest,
  OpenAIResponse,
  OpenAIStreamChunk,
  GeminiRequest,
  GeminiResponse,
  GeminiContent,
  GeminiStreamChunk,
  ModelMap,
} from './types.js'

const DEFAULT_MODEL_MAP: ModelMap = {
  'gpt-4o': 'gemini-2.5-flash',
  'gpt-4o-mini': 'gemini-2.5-flash',
  'gpt-4': 'gemini-2.5-flash',
  'gpt-3.5-turbo': 'gemini-2.5-flash',
  'deepseek-chat': 'gemini-2.5-flash',
  'deepseek-v4': 'gemini-2.5-flash',
}

function openAIMessagesToGeminiContents(messages: OpenAIRequest['messages']): {
  contents: GeminiContent[]
  systemInstruction?: GeminiRequest['system_instruction']
} {
  const systemParts: string[] = []
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (msg.content) systemParts.push(msg.content)
      continue
    }

    const geminiRole = msg.role === 'assistant' ? 'model' : 'user'
    contents.push({
      role: geminiRole,
      parts: [{ text: msg.content ?? '' }],
    })
  }

  return {
    contents,
    systemInstruction: systemParts.length > 0
      ? { parts: [{ text: systemParts.join('\n') }] }
      : undefined,
  }
}

export function openaiToGeminiRequest(
  oaiReq: OpenAIRequest,
  modelMap?: ModelMap,
): GeminiRequest {
  const map = modelMap ?? DEFAULT_MODEL_MAP
  const { contents, systemInstruction } = openAIMessagesToGeminiContents(oaiReq.messages)

  return {
    contents,
    ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
    generationConfig: {
      maxOutputTokens: oaiReq.max_tokens,
      temperature: oaiReq.temperature,
      topP: oaiReq.top_p,
      stopSequences: oaiReq.stop ? (Array.isArray(oaiReq.stop) ? oaiReq.stop : [oaiReq.stop]) : undefined,
      responseMimeType: oaiReq.response_format?.type === 'json_object' ? 'application/json' : undefined,
    },
    tools: oaiReq.tools,
  }
}

export function geminiToOpenAIResponse(
  gResp: GeminiResponse,
  originalModel: string,
): OpenAIResponse {
  const text = gResp.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join('') ?? ''

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: originalModel,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text || null },
      finish_reason: gResp.candidates?.[0]?.finishReason?.toLowerCase() ?? null,
    }],
    usage: {
      prompt_tokens: gResp.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: gResp.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: gResp.usageMetadata?.totalTokenCount ?? 0,
    },
  }
}

export function geminiStreamChunkToOpenAI(
  chunk: GeminiStreamChunk,
  model: string,
): OpenAIStreamChunk | null {
  const text = chunk.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    .map(p => p.text)
    .join('') ?? ''

  if (!text && !chunk.candidates?.[0]?.finishReason) return null

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      delta: { content: text || null },
      finish_reason: chunk.candidates?.[0]?.finishReason?.toLowerCase() ?? null,
    }],
  }
}

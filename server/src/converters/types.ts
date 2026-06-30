export type TargetFormat = 'openai' | 'anthropic' | 'gemini'

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  name?: string
  tool_calls?: unknown[]
  tool_call_id?: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  stop?: string | string[]
  tools?: unknown[]
  tool_choice?: unknown
  response_format?: { type: string }
  frequency_penalty?: number
  presence_penalty?: number
  user?: string
}

export interface OpenAIChoice {
  index: number
  message: {
    role: string
    content: string | null
    tool_calls?: unknown[]
  }
  finish_reason: string | null
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: OpenAIChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    delta: { role?: string; content?: string | null; tool_calls?: unknown[] }
    finish_reason: string | null
  }[]
}

export interface AnthropicRequest {
  model: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  system?: string
  max_tokens: number
  temperature?: number
  top_p?: number
  stream?: boolean
  stop_sequences?: string[]
  tools?: unknown[]
  tool_choice?: unknown
}

export interface AnthropicContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: unknown
}

export interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: AnthropicContentBlock[]
  model: string
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface AnthropicStreamEvent {
  type: string
  delta?: { text?: string; type?: string }
  content_block?: AnthropicContentBlock
  index?: number
  message?: AnthropicResponse
}

export interface GeminiContent {
  role: string
  parts: { text?: string; inline_data?: unknown; function_call?: unknown }[]
}

export interface GeminiRequest {
  contents: GeminiContent[]
  system_instruction?: { parts: { text: string }[] }
  generationConfig?: {
    maxOutputTokens?: number
    temperature?: number
    topP?: number
    stopSequences?: string[]
    responseMimeType?: string
  }
  tools?: unknown[]
}

export interface GeminiCandidate {
  index: number
  content: GeminiContent
  finishReason: string
}

export interface GeminiResponse {
  candidates: GeminiCandidate[]
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
  modelVersion: string
}

export interface GeminiStreamChunk {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export interface ModelMap {
  [openaiModel: string]: string
}

import type {
  OpenAIRequest,
  OpenAIResponse,
  OpenAIStreamChunk,
  AnthropicResponse,
  AnthropicStreamEvent,
  GeminiResponse,
  GeminiStreamChunk,
  TargetFormat,
  ModelMap,
} from './types.js'
import { passthroughRequest } from './openai.js'
import {
  openaiToAnthropicRequest,
  anthropicToOpenAIResponse,
  anthropicStreamToOpenAIChunk,
} from './anthropic.js'
import {
  openaiToGeminiRequest,
  geminiToOpenAIResponse,
  geminiStreamChunkToOpenAI,
} from './gemini.js'

export function convertRequest(
  oaiReq: OpenAIRequest,
  targetFormat: TargetFormat,
  modelMap?: ModelMap,
): { body: unknown; format: TargetFormat } {
  switch (targetFormat) {
    case 'openai':
      return { body: passthroughRequest(oaiReq), format: 'openai' }
    case 'anthropic':
      return { body: openaiToAnthropicRequest(oaiReq, modelMap), format: 'anthropic' }
    case 'gemini':
      return { body: openaiToGeminiRequest(oaiReq, modelMap), format: 'gemini' }
    default:
      return { body: passthroughRequest(oaiReq), format: 'openai' }
  }
}

export function convertResponse(
  responseBody: unknown,
  originalModel: string,
  targetFormat: TargetFormat,
): OpenAIResponse {
  switch (targetFormat) {
    case 'openai':
      return responseBody as OpenAIResponse
    case 'anthropic':
      return anthropicToOpenAIResponse(responseBody as AnthropicResponse, originalModel)
    case 'gemini':
      return geminiToOpenAIResponse(responseBody as GeminiResponse, originalModel)
    default:
      return responseBody as OpenAIResponse
  }
}

export function convertStreamChunk(
  chunk: unknown,
  model: string,
  targetFormat: TargetFormat,
): OpenAIStreamChunk | null {
  switch (targetFormat) {
    case 'openai':
      return chunk as OpenAIStreamChunk
    case 'anthropic':
      return anthropicStreamToOpenAIChunk(chunk as AnthropicStreamEvent, model)
    case 'gemini':
      return geminiStreamChunkToOpenAI(chunk as GeminiStreamChunk, model)
    default:
      return chunk as OpenAIStreamChunk
  }
}

export type { TargetFormat, OpenAIRequest, OpenAIResponse, OpenAIStreamChunk, AnthropicResponse, GeminiResponse }
export type { ModelMap } from './types.js'

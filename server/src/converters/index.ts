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
  DEFAULT_MODEL_MAP as ANTHROPIC_MODEL_MAP,
} from './anthropic.js'
import {
  openaiToGeminiRequest,
  geminiToOpenAIResponse,
  geminiStreamChunkToOpenAI,
  DEFAULT_MODEL_MAP as GEMINI_MODEL_MAP,
} from './gemini.js'

export function convertRequest(
  oaiReq: OpenAIRequest,
  targetFormat: TargetFormat,
  modelMap?: ModelMap,
): { body: unknown; format: TargetFormat; mappedModel?: string } {
  switch (targetFormat) {
    case 'openai':
      return { body: passthroughRequest(oaiReq), format: 'openai' }
    case 'anthropic': {
      const map = modelMap ?? ANTHROPIC_MODEL_MAP
      return {
        body: openaiToAnthropicRequest(oaiReq, modelMap),
        format: 'anthropic',
        mappedModel: map[oaiReq.model] ?? oaiReq.model,
      }
    }
    case 'gemini': {
      const map = modelMap ?? GEMINI_MODEL_MAP
      return {
        body: openaiToGeminiRequest(oaiReq, modelMap),
        format: 'gemini',
        mappedModel: map[oaiReq.model] ?? oaiReq.model,
      }
    }
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

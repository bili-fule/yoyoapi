import db from '../db/index.js'
import { getChannelById } from './channel.service.js'
import { convertRequest, convertResponse } from '../converters/index.js'
import type { OpenAIRequest, OpenAIResponse, TargetFormat } from '../converters/types.js'

export interface RelayOptions {
  apiKeyId: number
  userId: number
  targetFormat: TargetFormat
  channelId: number
  model: string
}

function buildUpstreamUrl(baseUrl: string, format: TargetFormat, model: string): string {
  switch (format) {
    case 'anthropic':
      return `${baseUrl.replace(/\/+$/, '')}/v1/messages`
    case 'gemini': {
      const modelPath = model.includes('/') ? model.split('/').pop()! : model
      return `${baseUrl.replace(/\/+$/, '')}/v1beta/models/${modelPath}:streamGenerateContent`
    }
    default:
      return `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  }
}

function buildUpstreamHeaders(format: TargetFormat, channelApiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  switch (format) {
    case 'anthropic':
      headers['x-api-key'] = channelApiKey
      headers['anthropic-version'] = '2023-06-01'
      break
    case 'gemini':
      headers['x-goog-api-key'] = channelApiKey
      break
    default:
      headers['Authorization'] = `Bearer ${channelApiKey}`
  }

  return headers
}

async function relayToUpstream(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  stream: boolean,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...(stream ? {} : {}),
  })
}

export async function relayChatCompletion(
  oaiReq: OpenAIRequest,
  options: RelayOptions,
): Promise<{ response: OpenAIResponse; usage: { promptTokens: number; completionTokens: number } }> {
  const channel = getChannelById(options.channelId)
  if (!channel) throw new Error('Channel not found')
  if (channel.status !== 1) throw new Error('Channel disabled')

  const { body: convertedBody, format } = convertRequest(oaiReq, options.targetFormat)

  const upstreamUrl = buildUpstreamUrl(channel.base_url, format, options.model)
  const upstreamHeaders = buildUpstreamHeaders(format, channel.api_key)

  const resp = await relayToUpstream(upstreamUrl, upstreamHeaders, convertedBody, oaiReq.stream ?? false)

  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`Upstream error ${resp.status}: ${errorText}`)
  }

  const rawBody = await resp.json()
  const oaiResponse = convertResponse(rawBody, oaiReq.model, format)

  const promptTokens = oaiResponse.usage?.prompt_tokens ?? 0
  const completionTokens = oaiResponse.usage?.completion_tokens ?? 0

  logUsage({
    userId: options.userId,
    apiKeyId: options.apiKeyId,
    channelId: options.channelId,
    model: oaiReq.model,
    targetFormat: options.targetFormat,
    promptTokens,
    completionTokens,
    success: true,
  })

  return {
    response: oaiResponse,
    usage: { promptTokens, completionTokens },
  }
}

interface LogEntry {
  userId: number
  apiKeyId: number
  channelId: number
  model: string
  targetFormat: TargetFormat
  promptTokens: number
  completionTokens: number
  success: boolean
  errorMsg?: string
}

function logUsage(entry: LogEntry): void {
  db.prepare(`
    INSERT INTO logs (user_id, api_key_id, channel_id, model, target_format, prompt_tokens, completion_tokens, quota_cost, success, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.userId,
    entry.apiKeyId,
    entry.channelId,
    entry.model,
    entry.targetFormat,
    entry.promptTokens,
    entry.completionTokens,
    entry.promptTokens + entry.completionTokens * 3,
    entry.success ? 1 : 0,
    entry.errorMsg ?? null,
  )
}

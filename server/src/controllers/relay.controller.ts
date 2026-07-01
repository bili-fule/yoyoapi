import type { Response } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import type { TargetFormat, OpenAIRequest } from '../converters/types.js'
import { relayChatCompletion, deductQuota, logUsage, type LogEntry, type RelayResult } from '../services/relay.service.js'
import db from '../db/index.js'
import { getEnabledChannelsByType } from '../services/channel.service.js'
import { convertStreamChunk, convertRequest } from '../converters/index.js'
import { formatStreamChunkSSE, formatDoneSSE } from '../converters/openai.js'

function tryExtractUsage(data: unknown): { promptTokens: number; completionTokens: number } | null {
  const obj = data as Record<string, unknown>
  if (obj.usage && typeof obj.usage === 'object') {
    const usage = obj.usage as Record<string, number>
    return {
      promptTokens: usage.prompt_tokens ?? usage.promptTokenCount ?? 0,
      completionTokens: usage.completion_tokens ?? usage.candidatesTokenCount ?? 0,
    }
  }
  if (obj.type === 'message_delta' && obj.message && typeof obj.message === 'object') {
    const msg = obj.message as Record<string, unknown>
    if (msg.usage && typeof msg.usage === 'object') {
      const usage = msg.usage as Record<string, number>
      return {
        promptTokens: usage.input_tokens ?? 0,
        completionTokens: usage.output_tokens ?? 0,
      }
    }
  }
  if (obj.usageMetadata && typeof obj.usageMetadata === 'object') {
    const meta = obj.usageMetadata as Record<string, number>
    return {
      promptTokens: meta.promptTokenCount ?? 0,
      completionTokens: meta.candidatesTokenCount ?? 0,
    }
  }
  return null
}

export async function chatCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const targetFormat: TargetFormat = (req.headers['x-target-format'] as TargetFormat) ?? 'openai'
  const oaiReq = req.body as OpenAIRequest

  if (!oaiReq.model) {
    res.status(400).json({ error: { message: 'Model is required' } })
    return
  }

  const channels = getEnabledChannelsByType(targetFormat === 'openai' ? 'openai' : targetFormat)
  if (channels.length === 0) {
    res.status(503).json({ error: { message: 'No available upstream channels' } })
    return
  }

  const channel = channels[0]!

  try {
    const { mappedModel } = convertRequest(oaiReq, targetFormat)
    const result = await relayChatCompletion(oaiReq, {
      apiKeyId: req.apiKeyId,
      userId: req.user.id,
      targetFormat,
      channelId: channel.id,
      model: mappedModel ?? oaiReq.model,
    })

    if ('stream' in result) {
      await handleStreamingResponse(result, req, channel.id, res)
      return
    }

    res.json(result.response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Relay failed'
    res.status(502).json({ error: { message: msg } })
  }
}

async function handleStreamingResponse(
  result: RelayResult & { stream: Response; model: string; targetFormat: TargetFormat },
  req: AuthenticatedRequest,
  channelId: number,
  res: Response,
): Promise<void> {
  const upstreamRes = result.stream

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const reader = upstreamRes.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0

  let streamTimeout: ReturnType<typeof setTimeout> | undefined

  const clearStreamTimeout = (): void => {
    if (streamTimeout) {
      clearTimeout(streamTimeout)
      streamTimeout = undefined
    }
  }

  const resetStreamTimeout = (): void => {
    clearStreamTimeout()
    streamTimeout = setTimeout(() => {
      reader.cancel().catch(() => {})
    }, 60000)
  }

  const processLine = (line: string): void => {
    if (!line.startsWith('data: ')) return
    const data = line.slice(6).trim()
    if (data === '[DONE]') {
      res.write(formatDoneSSE())
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return
    }

    const usage = tryExtractUsage(parsed)
    if (usage) {
      promptTokens = usage.promptTokens
      completionTokens = usage.completionTokens
    }

    const converted = convertStreamChunk(parsed, result.model, result.targetFormat)
    if (!converted) return

    res.write(formatStreamChunkSSE(converted))
  }

  try {
    while (true) {
      resetStreamTimeout()
      const { done, value } = await reader.read()
      clearStreamTimeout()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        processLine(line.trim())
      }
    }

    if (buffer.trim()) {
      processLine(buffer.trim())
    }
  } catch {
    // upstream stream error or idle timeout — end gracefully
  } finally {
    clearStreamTimeout()
  }

  res.end()

  const usage: LogEntry = {
    userId: req.user.id,
    apiKeyId: req.apiKeyId,
    channelId,
    model: result.model,
    targetFormat: result.targetFormat,
    promptTokens,
    completionTokens,
    success: true,
  }
  db.transaction(() => {
    deductQuota(usage.userId, usage.promptTokens, usage.completionTokens)
    logUsage(usage)
  })()
}

export function listModels(_req: Request, res: Response): void {
  const channels = getEnabledChannelsByType('openai')
  const models = channels.flatMap(c => JSON.parse(c.models) as string[])
  const unique = [...new Set(models)]

  res.json({
    object: 'list',
    data: unique.map((id: string) => ({
      id,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'yoyoapi',
    })),
  })
}

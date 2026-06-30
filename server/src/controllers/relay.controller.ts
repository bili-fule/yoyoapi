import type { Request, Response } from 'express'
import type { TargetFormat, OpenAIRequest } from '../converters/types.js'
import { relayChatCompletion } from '../services/relay.service.js'
import { getEnabledChannelsByType } from '../services/channel.service.js'

export async function chatCompletion(req: Request, res: Response): Promise<void> {
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
    const result = await relayChatCompletion(oaiReq, {
      apiKeyId: req.apiKeyId!,
      userId: req.user!.id,
      targetFormat,
      channelId: channel.id,
      model: oaiReq.model,
    })
    res.json(result.response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Relay failed'
    res.status(502).json({ error: { message: msg } })
  }
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

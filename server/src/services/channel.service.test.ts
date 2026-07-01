import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import {
  createChannel,
  listChannels,
  getChannelById,
  getEnabledChannelsByType,
  updateChannel,
  deleteChannel,
} from './channel.service.js'

beforeAll(() => {
  initDB()
})

beforeEach(() => {
  db.prepare('DELETE FROM channels').run()
})

describe('ChannelService', () => {
  it('should CRUD channels', () => {
    const ch1 = createChannel({
      name: 'test-openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test123',
      models: ['gpt-4', 'gpt-3.5-turbo'],
      priority: 2,
    })
    expect(ch1.name).toBe('test-openai')
    expect(ch1.models).toEqual(['gpt-4', 'gpt-3.5-turbo'])
    expect(ch1.type).toBe('openai')

    const ch2 = createChannel({
      name: 'test-anthropic',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'sk-ant-test',
    })
    expect(ch2.type).toBe('anthropic')

    const all = listChannels()
    expect(all.length).toBe(2)

    const fetched = getChannelById(ch1.id)
    expect(fetched).toBeDefined()
    expect(fetched!.name).toBe('test-openai')

    const updated = updateChannel(ch1.id, { name: 'renamed', priority: 5 })
    expect(updated!.name).toBe('renamed')
    expect(updated!.priority).toBe(5)

    const deleted = deleteChannel(ch1.id)
    expect(deleted).toBe(true)

    const afterDelete = listChannels()
    expect(afterDelete.length).toBe(1)
  })

  it('getEnabledChannelsByType returns only enabled channels of matching type', () => {
    createChannel({ name: 'ch1', baseUrl: 'https://a.com', apiKey: 'sk-1', type: 'openai', priority: 1 })
    createChannel({ name: 'ch2', baseUrl: 'https://b.com', apiKey: 'sk-2', type: 'anthropic', priority: 1 })
    // disabled channel
    const ch3 = createChannel({ name: 'ch3', baseUrl: 'https://c.com', apiKey: 'sk-3', type: 'openai', priority: 1 })
    updateChannel(ch3.id, { status: 0 })

    const openaiChannels = getEnabledChannelsByType('openai')
    expect(openaiChannels).toHaveLength(1)
    expect(openaiChannels[0]!.name).toBe('ch1')

    const anthropicChannels = getEnabledChannelsByType('anthropic')
    expect(anthropicChannels).toHaveLength(1)
    expect(anthropicChannels[0]!.name).toBe('ch2')

    const geminiChannels = getEnabledChannelsByType('gemini')
    expect(geminiChannels).toHaveLength(0)
  })

  it('getEnabledChannelsByType returns ordered by priority DESC, id ASC', () => {
    const c1 = createChannel({ name: 'low', baseUrl: 'https://a.com', apiKey: 'sk-1', type: 'openai', priority: 1 })
    const c2 = createChannel({ name: 'high', baseUrl: 'https://b.com', apiKey: 'sk-2', type: 'openai', priority: 10 })
    const c3 = createChannel({ name: 'mid', baseUrl: 'https://c.com', apiKey: 'sk-3', type: 'openai', priority: 5 })
    // same priority as mid, created after → lower id order
    const c4 = createChannel({ name: 'mid-dup', baseUrl: 'https://d.com', apiKey: 'sk-4', type: 'openai', priority: 5 })

    const channels = getEnabledChannelsByType('openai')
    expect(channels).toHaveLength(4)
    expect(channels[0]!.name).toBe('high')   // priority 10
    expect(channels[1]!.name).toBe('mid')     // priority 5, id asc
    expect(channels[2]!.name).toBe('mid-dup') // priority 5, id asc
    expect(channels[3]!.name).toBe('low')     // priority 1
  })

  it('updateChannel on non-existent id returns undefined', () => {
    const result = updateChannel(99999, { name: 'ghost' })
    expect(result).toBeUndefined()
  })

  it('deleteChannel on non-existent id returns false', () => {
    const result = deleteChannel(99999)
    expect(result).toBe(false)
  })
})

import { describe, it, expect, beforeAll } from 'vitest'
import { initDB } from '../db/index.js'
import db from '../db/index.js'
import {
  createChannel,
  listChannels,
  getChannelById,
  updateChannel,
  deleteChannel,
} from './channel.service.js'

beforeAll(() => {
  initDB()
})

describe('ChannelService', () => {
  it('should CRUD channels', () => {
    db.prepare('DELETE FROM channels').run()

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
})

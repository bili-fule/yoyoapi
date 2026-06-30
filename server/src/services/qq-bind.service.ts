import { config } from '../config.js'

const QQ_USER_PREFIX = 'yoyoapi_'

interface BindCodeResponse {
  code: string
  expire_seconds: number
}

interface BindQueryResponse {
  bound: boolean
  qq: string
  user_id: string
}

function getBaseUrl(): string {
  if (!config.qq.botBaseUrl) {
    throw new Error('QQ bot base URL not configured')
  }
  return config.qq.botBaseUrl.replace(/\/+$/, '')
}

export async function getBindCode(userId: number): Promise<BindCodeResponse> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/plug/api/v1/bind/code?user_id=${QQ_USER_PREFIX}${userId}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`AstrBot returned ${resp.status}`)
  }

  const data = await resp.json() as BindCodeResponse
  if (!data.code) {
    throw new Error('Invalid response from AstrBot')
  }

  return data
}

export async function confirmBind(userId: number): Promise<{ qqId: string }> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/plug/api/v1/bind/query?user_id=${QQ_USER_PREFIX}${userId}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`AstrBot returned ${resp.status}`)
  }

  const data = await resp.json() as BindQueryResponse

  const expectedUserId = `${QQ_USER_PREFIX}${userId}`
  if (data.user_id && data.user_id !== expectedUserId) {
    throw new Error('User ID mismatch')
  }

  if (!data.bound) {
    throw new Error('QQ not bound yet. Send the code to the QQ bot first.')
  }

  return { qqId: data.qq }
}

export async function unbindQq(userId: number): Promise<void> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/api/plug/api/v1/bind/unbind?user_id=${QQ_USER_PREFIX}${userId}`

  const resp = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) {
    throw new Error(`AstrBot returned ${resp.status}`)
  }
}

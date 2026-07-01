const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

interface ApiOptions {
  method?: string
  body?: unknown
  token?: string
}

export async function apiRequest<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Request failed: ${res.status}`)
  }

  return data as T
}

// Auth
export async function sendCode(email: string, type: 'register' | 'reset'): Promise<void> {
  await apiRequest('/auth/send-code', {
    method: 'POST',
    body: { email, type },
  })
}

export async function register(
  email: string,
  password: string,
  code: string,
  displayName?: string,
): Promise<{ user: { id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string }; apiKey: string }> {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password, code, displayName },
  })
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: { id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string }; apiKey: string }> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  })
}

// User profile
export async function getProfile(
  token: string,
): Promise<{ user: { id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string } }> {
  return apiRequest('/user/profile', { token })
}

export async function updateProfile(
  token: string,
  displayName: string,
): Promise<{ user: { id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string } }> {
  return apiRequest('/user/profile', {
    method: 'PUT',
    token,
    body: { displayName },
  })
}

// API keys
export async function listApiKeys(
  token: string,
): Promise<{ apiKeys: Array<{ id: number; keyPrefix: string; name: string; status: number; lastUsedAt: string | null }> }> {
  return apiRequest('/user/api-keys', { token })
}

export async function createApiKey(
  token: string,
  name?: string,
): Promise<{ apiKey: { id: number; keyPrefix: string; name: string; status: number; lastUsedAt: string | null } }> {
  return apiRequest('/user/api-keys', {
    method: 'POST',
    token,
    body: { name },
  })
}

export async function deleteApiKey(token: string, id: number): Promise<{ message: string }> {
  return apiRequest(`/user/api-keys/${id}`, {
    method: 'DELETE',
    token,
  })
}

// QQ bind
export async function getQqBindCode(token: string): Promise<{ code: string; expire_seconds: number }> {
  return apiRequest('/user/bind/qq/code', { token })
}

export async function confirmQqBind(token: string): Promise<{ message: string; qq_id: string }> {
  return apiRequest('/user/bind/qq', {
    method: 'POST',
    token,
  })
}

export async function unbindQq(token: string): Promise<{ message: string }> {
  return apiRequest('/user/bind/qq', {
    method: 'DELETE',
    token,
  })
}

// Admin — users
export async function listUsers(
  token: string,
  page?: number,
  pageSize?: number,
): Promise<{ users: Array<{ id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string; created_at: string }>; total: number }> {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (pageSize !== undefined) params.set('pageSize', String(pageSize))
  const qs = params.toString()
  return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`, { token })
}

export async function updateUser(
  token: string,
  id: number,
  data: { role?: number; quota?: number; displayName?: string; qqId?: string },
): Promise<{ user: unknown }> {
  return apiRequest(`/admin/users/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteUser(token: string, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/users/${id}`, {
    method: 'DELETE',
    token,
  })
}

// Admin — channels
export async function listChannels(
  token: string,
): Promise<{ channels: Array<{ id: number; name: string; type: string; baseUrl: string; apiKey: string; models: string[]; status: number; priority: number }> }> {
  return apiRequest('/admin/channels', { token })
}

export async function createChannel(
  token: string,
  data: { name: string; type?: string; baseUrl: string; apiKey: string; models?: string[]; priority?: number },
): Promise<{ channel: unknown }> {
  return apiRequest('/admin/channels', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateChannel(
  token: string,
  id: number,
  data: { name?: string; type?: string; baseUrl?: string; apiKey?: string; models?: string[]; priority?: number; status?: number },
): Promise<{ channel: unknown }> {
  return apiRequest(`/admin/channels/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteChannel(token: string, id: number): Promise<{ message: string }> {
  return apiRequest(`/admin/channels/${id}`, {
    method: 'DELETE',
    token,
  })
}

// Admin — logs & stats
export async function getLogs(
  token: string,
  page?: number,
  userId?: number,
): Promise<{ logs: Array<{ id: number; user_id: number; model: string; prompt_tokens: number; completion_tokens: number; quota_cost: number; created_at: string }>; total: number }> {
  const params = new URLSearchParams()
  if (page !== undefined) params.set('page', String(page))
  if (userId !== undefined) params.set('userId', String(userId))
  const qs = params.toString()
  return apiRequest(`/admin/logs${qs ? `?${qs}` : ''}`, { token })
}

export async function getStats(token: string): Promise<{ totalUsers: number; todayUsage: number }> {
  return apiRequest('/admin/stats', { token })
}

const API_BASE = '/api'

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

export async function sendCode(email: string, type: 'register' | 'reset'): Promise<void> {
  await apiRequest('/auth/send-code', {
    method: 'POST',
    body: { email, type },
  })
}

export async function register(email: string, password: string, code: string, displayName?: string) {
  return apiRequest<{ user: unknown; apiKey: string }>('/auth/register', {
    method: 'POST',
    body: { email, password, code, displayName },
  })
}

export async function login(email: string, password: string) {
  return apiRequest<{ user: unknown; apiKey: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function getProfile(token: string) {
  return apiRequest<{ user: { id: number; email: string; display_name: string; role: number; quota: number; used_quota: number; qq_id: string } }>('/user/profile', { token })
}

export async function updateProfile(token: string, displayName: string) {
  return apiRequest('/user/profile', {
    method: 'PUT',
    token,
    body: { displayName },
  })
}

export async function listApiKeys(token: string) {
  return apiRequest<{ apiKeys: unknown[] }>('/user/api-keys', { token })
}

export async function createApiKey(token: string, name?: string) {
  return apiRequest('/user/api-keys', {
    method: 'POST',
    token,
    body: { name },
  })
}

export async function deleteApiKey(token: string, id: number) {
  return apiRequest(`/user/api-keys/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function getQqBindCode(token: string) {
  return apiRequest<{ code: string; expire_seconds: number }>('/user/bind/qq/code', { token })
}

export async function confirmQqBind(token: string) {
  return apiRequest<{ message: string; qq_id: string }>('/user/bind/qq', {
    method: 'POST',
    token,
  })
}

export async function unbindQq(token: string) {
  return apiRequest<{ message: string }>('/user/bind/qq', {
    method: 'DELETE',
    token,
  })
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  })
}

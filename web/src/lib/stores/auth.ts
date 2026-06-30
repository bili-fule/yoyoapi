import { writable } from 'svelte/store'

export interface AuthState {
  token: string | null
  user: {
    id: number
    email: string
    display_name: string
    role: number
    quota: number
    used_quota: number
    qq_id: string
  } | null
}

function loadAuth(): AuthState {
  if (typeof window === 'undefined') return { token: null, user: null }
  try {
    const stored = localStorage.getItem('yoyoapi_auth')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { token: null, user: null }
}

function saveAuth(state: AuthState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('yoyoapi_auth', JSON.stringify(state))
  }
}

export const auth = writable<AuthState>(loadAuth())

auth.subscribe(saveAuth)

export function setAuth(token: string, user: AuthState['user']): void {
  auth.set({ token, user })
}

export function clearAuth(): void {
  auth.set({ token: null, user: null })
}

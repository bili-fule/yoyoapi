'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface User {
  id: number
  email: string
  display_name: string
  role: number
  quota: number
  used_quota: number
  qq_id: string
}

interface AuthContextValue {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
}

interface StoredAuth {
  token: string
  user: User
}

const STORAGE_KEY = 'yoyoapi_auth'

function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredAuth
  } catch {
    // corrupted data — ignore
  }
  return null
}

function saveAuth(auth: StoredAuth | null): void {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredAuth | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setStored(loadAuth())
    setLoaded(true)
  }, [])

  const login = useCallback((token: string, user: User) => {
    const auth = { token, user }
    saveAuth(auth)
    setStored(auth)
  }, [])

  const logout = useCallback(() => {
    saveAuth(null)
    setStored(null)
  }, [])

  const setUser = useCallback((user: User) => {
    setStored((prev) => {
      if (!prev) return prev
      const auth = { ...prev, user }
      saveAuth(auth)
      return auth
    })
  }, [])

  const value: AuthContextValue = {
    token: stored?.token ?? null,
    user: stored?.user ?? null,
    isAuthenticated: loaded && stored !== null,
    isAdmin: stored?.user?.role === 10,
    login,
    logout,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

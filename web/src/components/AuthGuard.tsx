'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Need one tick for auth to hydrate from localStorage
    const id = requestAnimationFrame(() => {
      setReady(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (ready && token === null) {
      router.push('/login')
    }
  }, [ready, token, router])

  if (!ready || !isAuthenticated) return null

  return <>{children}</>
}

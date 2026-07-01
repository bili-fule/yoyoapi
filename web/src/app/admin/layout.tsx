'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import styles from './layout.module.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, token } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (ready && token === null) {
      router.push('/login')
    }
  }, [ready, token, router])

  if (!ready || !isAuthenticated) return null

  if (!isAdmin) {
    return (
      <div className={styles.denied}>
        <h1 className={styles.deniedTitle}>{t('admin.accessDenied')}</h1>
        <p className={styles.deniedDesc}>{t('admin.accessDenied.desc')}</p>
        <Link href="/dashboard" className={styles.deniedLink}>Back to Dashboard</Link>
      </div>
    )
  }

  return <>{children}</>
}

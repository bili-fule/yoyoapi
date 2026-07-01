'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login as apiLogin } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const { login: authLogin } = useAuth()

  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)

    try {
      const result = await apiLogin(email, password)
      authLogin(result.apiKey, result.user)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={styles.description}>{t('login.description')}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              required
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? t('login.loading') : t('login.button')}
          </button>
        </form>

        <div className={styles.footer}>
          <Link href="/reset-password/">{t('login.forgot')}</Link>
          <span className={styles.separator}>&middot;</span>
          <Link href="/register/">{t('login.noAccount')}</Link>
        </div>
      </div>
    </div>
  )
}

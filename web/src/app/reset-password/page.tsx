'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sendCode, resetPassword as apiResetPassword } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import styles from './page.module.css'

type Step = 'code' | 'reset'

const COUNTDOWN_SECONDS = 60

export default function ResetPasswordPage() {
  const router = useRouter()

  const { t } = useI18n()

  const [step, setStep] = useState<Step>('code')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCountdown() {
    setCountdown(COUNTDOWN_SECONDS)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault()
    if (loading || countdown > 0) return

    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      await sendCode(email, 'reset')
      setSuccessMsg(t('auth.codeSent', { email }))
      startCountdown()
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (loading) return

    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      await apiResetPassword(email, code, newPassword)
      router.push('/login/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0) return

    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      await sendCode(email, 'reset')
      setSuccessMsg(t('reset.codeResent'))
      startCountdown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>{t('reset.title')}</h1>
        <p className={styles.description}>
          {step === 'code'
            ? t('reset.stepCode')
            : t('reset.stepReset')}
        </p>

        {step === 'code' ? (
          <form className={styles.form} onSubmit={handleSendCode}>
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

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? t('auth.sending') : t('auth.sendResetCode')}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleReset}>
            {error && <div className={styles.error}>{error}</div>}
            {successMsg && <div className={styles.success}>{successMsg}</div>}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="code">{t('auth.code')}</label>
              <input
                id="code"
                className={styles.codeInput}
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                placeholder={t('auth.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">{t('reset.newPassword')}</label>
              <input
                id="newPassword"
                className={styles.input}
                type="password"
                required
                minLength={6}
                placeholder={t('auth.passwordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={loading}
            >
              {loading ? t('reset.resetting') : t('reset.button')}
            </button>

            <div className={styles.resendArea}>
              {countdown > 0 ? (
                <span>{t('auth.resendIn', { s: countdown })}</span>
              ) : (
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={handleResend}
                  disabled={loading}
                >
                  {t('auth.resend')}
                </button>
              )}
            </div>
          </form>
        )}

        <div className={styles.footer}>
          <Link href="/login/">{t('reset.rememberPassword')}</Link>
        </div>
      </div>
    </div>
  )
}

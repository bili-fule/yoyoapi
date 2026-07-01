'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n'
import styles from './Header.module.css'

export function Header() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth()
  const { t, locale, setLocale } = useI18n()

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          {t('header.logo')}
        </Link>

        <nav className={styles.nav}>
          {!isAuthenticated ? (
            <>
              <Link href="/login" className={styles.link}>
                {t('header.login')}
              </Link>
              <Link href="/register" className={styles.link}>
                {t('header.register')}
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={styles.link}>
                {t('header.dashboard')}
              </Link>
              {isAdmin && (
                <Link href="/admin" className={styles.link}>
                  {t('header.admin')}
                </Link>
              )}
              <span className={styles.link}>{user?.display_name ?? user?.email}</span>
              <button type="button" className={styles.logoutBtn} onClick={logout}>
                {t('header.logout')}
              </button>
            </>
          )}
        </nav>

        <button
          type="button"
          className={styles.langBtn}
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          title={t('lang.switch')}
        >
          {locale === 'zh' ? t('lang.en') : t('lang.zh')}
        </button>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import styles from './not-found.module.css'

export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <p className={styles.statusCode}>{t('notFound.status')}</p>
        <h1 className={styles.heading}>{t('notFound.title')}</h1>
        <p className={styles.description}>
          {t('notFound.desc')}
        </p>
        <Link href="/" className={styles.goHome}>
          {t('notFound.goHome')}
        </Link>
      </div>
    </div>
  )
}

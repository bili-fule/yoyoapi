'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import styles from './page.module.css'

export default function HomePage() {
  const { t } = useI18n()

  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <p className={styles.subtitle}>
          {t('home.subtitle')}
        </p>
        <div className={styles.ctas}>
          <Link href="/register" className={styles.ctaPrimary}>
            {t('home.cta.getStarted')}
          </Link>
          <Link href="/login" className={styles.ctaSecondary}>
            {t('home.cta.signIn')}
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Features</h2>
        <div className={styles.grid}>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>{t('home.feature1.title')}</h3>
            <p className={styles.cardDesc}>
              {t('home.feature1.desc')}
            </p>
          </article>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>{t('home.feature2.title')}</h3>
            <p className={styles.cardDesc}>
              {t('home.feature2.desc')}
            </p>
          </article>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>{t('home.feature3.title')}</h3>
            <p className={styles.cardDesc}>
              {t('home.feature3.desc')}
            </p>
          </article>
        </div>
      </section>
    </>
  )
}

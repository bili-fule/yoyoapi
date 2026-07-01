'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { en, type TranslationKey } from './en'
import { zh } from './zh'

type Locale = 'en' | 'zh'

interface I18nContextValue {
  locale: Locale
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
}

const STORAGE_KEY = 'yoyoapi_locale'

const translations: Record<Locale, Record<TranslationKey, string>> = { en, zh }

function loadLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh') return stored
  } catch { /* ignore */ }
  return 'zh'
}

function saveLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
}

function translate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key as string]
    return val !== undefined ? String(val) : `{${key}}`
  })
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    setLocaleState(loadLocale())
  }, [])

  const setLocale = useCallback((l: Locale) => {
    saveLocale(l)
    setLocaleState(l)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = translations[locale][key]
      if (template === undefined) return key
      return translate(template, vars)
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

'use client'

import '@/styles/globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { Header } from '@/components/Header'

function HtmlLang({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  return (
    <html lang={locale === 'en' ? 'en' : 'zh-CN'}>
      {children}
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <HtmlLang>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>YoYOapi</title>
      </head>
      <body>
        <I18nProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
          </AuthProvider>
        </I18nProvider>
      </body>
    </HtmlLang>
  )
}

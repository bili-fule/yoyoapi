'use client'

import '@/styles/globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/lib/i18n'
import { Header } from '@/components/Header'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
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
    </html>
  )
}

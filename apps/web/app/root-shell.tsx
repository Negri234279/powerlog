import type { ReactNode } from 'react'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Space_Grotesk } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'

import type { Locale } from '@/lib/i18n/config'
import { Providers } from './providers'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    variable: '--font-space-grotesk',
    display: 'swap',
})

/**
 * The shared `<html>` document every root layout renders. Split out because the app
 * now has three root layouts — the dynamic app shell and one static shell per
 * marketing locale — and they must render an identical document (fonts, grain
 * overlay, the client provider tree). Each layout resolves its own `locale`/
 * `messages` (the app shell per request, the marketing shells at build time via
 * `setRequestLocale`) and hands them here.
 */
export function RootShell({
    locale,
    messages,
    children,
}: {
    locale: Locale
    messages: AbstractIntlMessages
    children: ReactNode
}) {
    return (
        <html
            lang={locale}
            data-scroll-behavior="smooth"
            className={`${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable}`}
        >
            <body className="bg-bg text-text antialiased">
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
                {/* Film-grain overlay — fixed, never intercepts pointer events. */}
                <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[60]" />
            </body>
        </html>
    )
}

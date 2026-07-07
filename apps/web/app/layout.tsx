import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Space_Grotesk } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { Providers } from './providers'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    variable: '--font-space-grotesk',
    display: 'swap',
})

export const metadata: Metadata = {
    title: {
        default: "powerlog — Train like it's logged",
        template: '%s · powerlog',
    },
    description:
        'A precision instrument for serious lifters. Log every set, track e1RM and PRs, read your real progress, and coach athletes — all in one obsidian-dark training tool.',
    applicationName: 'powerlog',
    keywords: ['powerlifting', 'strength training', 'workout tracker', 'e1RM', 'PR tracking', 'coaching'],
    openGraph: {
        title: "powerlog — Train like it's logged",
        description:
            'Log every set, track e1RM and PRs, read your real progress, and coach athletes. Built for people who take the bar seriously.',
        type: 'website',
    },
}

export const viewport: Viewport = {
    themeColor: '#07070a',
    colorScheme: 'dark',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // Locale + messages are resolved server-side (cookie → session → Accept-Language).
    const locale = await getLocale()
    const messages = await getMessages()

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

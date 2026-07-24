'use client'

import { useLocale } from 'next-intl'

import { cn } from '@/lib/cn'
import { LOCALE_COOKIE, LOCALE_LABELS, type Locale, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import { TrackedLink } from '@/components/ui/tracked'

/** Where each locale lives on the marketing site. */
const HREF: Record<Locale, string> = { en: '/', es: '/es' }

/**
 * Marketing language switcher. The app's `LanguageSwitcher` refreshes in place —
 * the authenticated tree resolves locale per request — but the landing bakes the
 * locale into the URL, so each option is a real, crawlable link to that locale's
 * page. The click also writes `NEXT_LOCALE`, before the anchor navigates, so the
 * choice sticks for later visits and the signed-in app, and so an explicit
 * "English" pick can't be bounced back to `/es` by the proxy's Accept-Language
 * redirect.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
    const active = useLocale() as Locale

    function persist(locale: Locale) {
        document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    }

    return (
        <div role="group" className={cn('inline-flex items-center gap-1', className)}>
            {SUPPORTED_LOCALES.map((locale) => (
                <TrackedLink
                    key={locale}
                    analyticsId={`footer-lang-${locale}`}
                    href={HREF[locale]}
                    hrefLang={locale}
                    onClick={() => persist(locale)}
                    aria-current={locale === active ? 'true' : undefined}
                    className={cn(
                        'rounded-full px-2 py-1 transition-colors',
                        locale === active ? 'text-text' : 'text-text-faint hover:text-text',
                    )}
                >
                    {LOCALE_LABELS[locale]}
                </TrackedLink>
            ))}
        </div>
    )
}

import 'server-only'

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { serverEnv } from '@/lib/env.server'
import { type LegalDoc, LEGAL_PATHS } from '@/lib/legal'
import type { Locale } from '@/lib/i18n/config'

/** Canonical origin (no trailing slash), e.g. `https://powerlog.negri.es`. */
export const siteUrl = serverEnv.siteUrl

/** Where each indexable marketing locale lives, plus the x-default (English). */
const MARKETING_LANGUAGES = {
    en: '/',
    es: '/es',
    'x-default': '/',
} as const

/**
 * `alternates` for a marketing page: its own `canonical` path plus the full set of
 * hreflang alternates (every locale + x-default). Both `/` and `/es` advertise the
 * same alternate set — only the canonical differs — so Google treats them as one
 * page in two languages. Resolved to absolute URLs against `metadataBase`.
 */
export function marketingAlternates(canonical: '/' | '/es'): Metadata['alternates'] {
    return { canonical, languages: MARKETING_LANGUAGES }
}

/**
 * `alternates` for a legal/support page. Canonical is the current locale's own
 * localized path; the hreflang set advertises both locales' paths plus x-default
 * (English), so `/privacy` and `/es/privacidad` are treated as one page in two
 * languages just like the landing.
 */
export function legalAlternates(doc: LegalDoc, locale: Locale): Metadata['alternates'] {
    return {
        canonical: LEGAL_PATHS[locale][doc],
        languages: {
            en: LEGAL_PATHS.en[doc],
            es: LEGAL_PATHS.es[doc],
            'x-default': LEGAL_PATHS.en[doc],
        },
    }
}

/**
 * Title/description/alternates for a legal page, resolved from its message
 * namespace. The locale is passed explicitly (not read from request scope) so it
 * works the same whether called from `generateMetadata` or a render. Layout-level
 * metadata (metadataBase, OpenGraph defaults) is merged in by Next.
 */
export async function legalMetadata(doc: LegalDoc, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `legal.${doc}` })

    return {
        title: t('title'),
        description: t('intro'),
        alternates: legalAlternates(doc, locale),
    }
}

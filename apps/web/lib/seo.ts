import 'server-only'

import type { Metadata } from 'next'

import { serverEnv } from '@/lib/env.server'

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

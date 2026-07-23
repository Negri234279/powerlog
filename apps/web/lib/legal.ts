import type { Locale } from '@/lib/i18n/config'

/**
 * The static policy/support pages that hang off the marketing site. Each doc has a
 * `legal.<doc>` message namespace and one prerendered page per locale. The slugs are
 * localized (Spanish gets its own path), so the mapping — not string interpolation —
 * is the single source of truth for where each doc lives, used by the pages'
 * canonical/alternate metadata and by the footer links.
 */
export const LEGAL_DOCS = ['privacy', 'terms', 'cookies', 'faq'] as const

export type LegalDoc = (typeof LEGAL_DOCS)[number]

export const LEGAL_PATHS: Record<Locale, Record<LegalDoc, string>> = {
    en: {
        privacy: '/privacy',
        terms: '/terms',
        cookies: '/cookies',
        faq: '/faq',
    },
    es: {
        privacy: '/es/privacidad',
        terms: '/es/terminos',
        cookies: '/es/cookies',
        faq: '/es/preguntas-frecuentes',
    },
}

export function isLegalDoc(value: string): value is LegalDoc {
    return (LEGAL_DOCS as readonly string[]).includes(value)
}

/** The contact page — same marketing chrome, but a form rather than a policy. */
export const CONTACT_PATHS: Record<Locale, string> = {
    en: '/contact',
    es: '/es/contacto',
}

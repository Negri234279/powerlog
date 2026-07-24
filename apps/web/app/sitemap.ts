import type { MetadataRoute } from 'next'

import { CONTACT_PATHS, LEGAL_DOCS, LEGAL_PATHS } from '@/lib/legal'
import { siteUrl } from '@/lib/seo'

/**
 * The indexable surface: the marketing home plus the legal/support pages, in both
 * locales. Each entry carries the hreflang alternates so Google reads the en/es pair
 * as one page in two languages. The authenticated app and auth funnel are
 * deliberately absent — they're noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    // No trailing slash on the root, to match the canonical/hreflang Next emits in
    // the page <head> exactly (`https://host`, not `https://host/`).
    const homeLanguages = {
        en: siteUrl,
        es: `${siteUrl}/es`,
    }

    const home: MetadataRoute.Sitemap = [
        {
            url: siteUrl,
            changeFrequency: 'weekly',
            priority: 1,
            alternates: { languages: homeLanguages },
        },
        {
            url: `${siteUrl}/es`,
            changeFrequency: 'weekly',
            priority: 1,
            alternates: { languages: homeLanguages },
        },
    ]

    const legal: MetadataRoute.Sitemap = LEGAL_DOCS.flatMap((doc) => {
        const languages = {
            en: `${siteUrl}${LEGAL_PATHS.en[doc]}`,
            es: `${siteUrl}${LEGAL_PATHS.es[doc]}`,
        }

        return (['en', 'es'] as const).map((locale) => ({
            url: `${siteUrl}${LEGAL_PATHS[locale][doc]}`,
            changeFrequency: 'yearly' as const,
            priority: 0.5,
            alternates: { languages },
        }))
    })

    const contactLanguages = {
        en: `${siteUrl}${CONTACT_PATHS.en}`,
        es: `${siteUrl}${CONTACT_PATHS.es}`,
    }
    const contact: MetadataRoute.Sitemap = (['en', 'es'] as const).map((locale) => ({
        url: `${siteUrl}${CONTACT_PATHS[locale]}`,
        changeFrequency: 'yearly' as const,
        priority: 0.5,
        alternates: { languages: contactLanguages },
    }))

    return [...home, ...legal, ...contact]
}

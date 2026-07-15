import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

/**
 * The indexable surface: the marketing home in both locales. Each entry carries the
 * hreflang alternates so Google reads `/` and `/es` as one page in two languages.
 * The authenticated app and auth funnel are deliberately absent — they're noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    // No trailing slash on the root, to match the canonical/hreflang Next emits in
    // the page <head> exactly (`https://host`, not `https://host/`).
    const languages = {
        en: siteUrl,
        es: `${siteUrl}/es`,
    }

    return [
        {
            url: siteUrl,
            changeFrequency: 'weekly',
            priority: 1,
            alternates: { languages },
        },
        {
            url: `${siteUrl}/es`,
            changeFrequency: 'weekly',
            priority: 1,
            alternates: { languages },
        },
    ]
}

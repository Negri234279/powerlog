import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

/**
 * Everything is crawlable except the BFF proxy (`/api/*`), so the `noindex` metas on
 * the authenticated app and auth pages are actually read and honoured. The sitemap
 * points at the two indexable marketing URLs.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: '/api/' },
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}

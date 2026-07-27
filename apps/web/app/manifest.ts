import type { MetadataRoute } from 'next'

/**
 * Web App Manifest — makes powerlog installable to the home screen (the
 * prerequisite for Web Push, especially on iOS 16.4+, which only delivers push to
 * an installed PWA). Served at `/manifest.webmanifest`; Next injects the
 * `<link rel="manifest">` automatically. Dark to match the app shell
 * (`background_color`/`theme_color` = the shell's obsidian, so the splash and
 * status bar don't flash white on launch).
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'powerlog',
        short_name: 'powerlog',
        description: 'Log every set, track e1RM and PRs, read your real progress, and coach athletes.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#07070a',
        theme_color: '#07070a',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    }
}

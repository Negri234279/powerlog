import type { Metadata, Viewport } from 'next'

/**
 * Base document metadata, shared by every root layout (the app shell and the two
 * marketing shells). Per-locale marketing overrides (canonical, hreflang) layer on
 * top of this in their own layouts.
 */
export const baseMetadata: Metadata = {
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

export const baseViewport: Viewport = {
    themeColor: '#07070a',
    colorScheme: 'dark',
}

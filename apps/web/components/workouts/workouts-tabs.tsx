'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

import { SlidingTabs } from '@/components/ui/sliding-tabs'

const TABS = [
    { value: '/workouts', key: 'sessions' },
    { value: '/workouts/mesocycles', key: 'mesocycles' },
    { value: '/workouts/templates', key: 'templates' },
    { value: '/workouts/stats', key: 'stats' },
    { value: '/workouts/ai', key: 'ai' },
] as const

/**
 * Sub-navigation shared by the training sections — a sliding-pill segmented
 * control, the same one the admin area uses. It replaced a row of header pills
 * that already wrapped on a phone; `SlidingTabs` scrolls instead.
 *
 * Detail screens (`/workouts/[id]`, `/workouts/mesocycles/[id]`) deliberately do
 * NOT render this: they are places you went *into* from a section, and they keep
 * their breadcrumb.
 */
export function WorkoutsTabs() {
    const t = useTranslations('workouts.tabs')
    const pathname = usePathname()
    const router = useRouter()

    return (
        <div className="mb-8">
            <SlidingTabs
                analyticsId="workouts-tabs"
                ariaLabel={t('label')}
                items={TABS.map((tab) => ({ value: tab.value, label: t(tab.key) }))}
                value={activeTab(pathname)}
                onChange={(href) => router.push(href)}
            />
        </div>
    )
}

/**
 * Longest matching prefix, not equality: `/workouts/ai/<id>` must keep AI lit and
 * `/workouts/mesocycles/new` must keep Mesocycles lit. Matching on equality would
 * fall back to Sessions on every nested route — `/workouts` is a prefix of them
 * all, so it can only ever be the answer when nothing longer matches.
 */
export function activeTab(pathname: string): string {
    const matches = TABS.filter((tab) => pathname === tab.value || pathname.startsWith(`${tab.value}/`))

    return matches.reduce((longest, tab) => (tab.value.length > longest.length ? tab.value : longest), '/workouts')
}

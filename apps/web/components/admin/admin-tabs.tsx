'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

import { SlidingTabs } from '@/components/ui/sliding-tabs'

const TABS = [
    { value: '/admin', key: 'overview' },
    { value: '/admin/exercises', key: 'exercises' },
    { value: '/admin/users', key: 'users' },
    { value: '/admin/plans', key: 'plans' },
    { value: '/admin/subscriptions', key: 'subscriptions' },
    { value: '/admin/billing', key: 'billing' },
    { value: '/admin/contact', key: 'contact' },
] as const

/** Sub-navigation shared by every admin page — a sliding-pill segmented control. */
export function AdminTabs() {
    const t = useTranslations('admin.tabs')
    const pathname = usePathname()
    const router = useRouter()
    const active = TABS.find((tab) => pathname === tab.value)?.value ?? '/admin'

    return (
        <div className="mb-8">
            <SlidingTabs
                analyticsId="admin-tabs"
                items={TABS.map((tab) => ({ value: tab.value, label: t(tab.key) }))}
                value={active}
                onChange={(href) => router.push(href)}
            />
        </div>
    )
}

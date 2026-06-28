'use client'

import { usePathname, useRouter } from 'next/navigation'

import { SlidingTabs } from '@/components/ui/sliding-tabs'

const TABS = [
    { value: '/admin', label: 'Overview' },
    { value: '/admin/exercises', label: 'Exercises' },
    { value: '/admin/users', label: 'Users' },
]

/** Sub-navigation shared by every admin page — a sliding-pill segmented control. */
export function AdminTabs() {
    const pathname = usePathname()
    const router = useRouter()
    const active = TABS.find((t) => pathname === t.value)?.value ?? '/admin'

    return (
        <div className="mb-8">
            <SlidingTabs items={TABS} value={active} onChange={(href) => router.push(href)} />
        </div>
    )
}

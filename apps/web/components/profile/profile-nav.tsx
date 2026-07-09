'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'
import { TrackedLink } from '@/components/ui/tracked'

const TABS = [
    { id: 'profile', href: '/profile' },
    { id: 'security', href: '/profile/security' },
    { id: 'ai', href: '/profile/ai' },
] as const

/** Horizontal sub-nav for the account area. Each tab is its own route, so
 *  sections are deep-linkable; the active pill mirrors the shell nav. */
export function ProfileNav() {
    const t = useTranslations('profile')
    const pathname = usePathname()

    // `/profile` is the index — exact match only, or it lights up on every
    // nested route. Deeper tabs also match their own sub-paths.
    function isActive(href: string): boolean {
        if (href === '/profile') return pathname === href
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <nav className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((tab) => (
                <TrackedLink
                    analyticsId={`profile-nav-${tab.id}`}
                    key={tab.href}
                    href={tab.href}
                    aria-current={isActive(tab.href) ? 'page' : undefined}
                    className={cn(
                        'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300',
                        isActive(tab.href) ? 'bg-white/[0.06] text-text' : 'text-text-dim hover:text-text',
                    )}
                >
                    {t(`nav.${tab.id}`)}
                </TrackedLink>
            ))}
        </nav>
    )
}

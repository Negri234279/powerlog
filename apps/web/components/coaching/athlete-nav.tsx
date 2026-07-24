'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'
import { TrackedLink } from '@/components/ui/tracked'

const SECTIONS = ['training', 'stats', 'plan'] as const

/**
 * Sub-nav for one athlete. Each section is its own route, so the coach can
 * deep-link into it, come back to it with the browser's Back button, and keep it
 * across a reload — none of which the previous `useState` tab worked with. That
 * matters most for the chat section to come: a "new message" notification has to
 * be able to link straight at the conversation.
 *
 * Training is the index route (`/coaching/athletes/<id>`), so every link that
 * already points at the athlete keeps landing on the section it used to open.
 */
export function AthleteNav({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const pathname = usePathname()

    const base = `/coaching/athletes/${athleteId}`

    function hrefOf(section: (typeof SECTIONS)[number]): string {
        return section === 'training' ? base : `${base}/${section}`
    }

    // Training is the index — exact match only, or it lights up on every nested
    // route. The others also match their own sub-paths.
    function isActive(href: string): boolean {
        if (href === base) return pathname === base
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <nav className="flex flex-wrap items-center gap-1.5">
            {SECTIONS.map((section) => {
                const href = hrefOf(section)
                const active = isActive(href)

                return (
                    <TrackedLink
                        analyticsId={`athlete-nav-${section}`}
                        key={section}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300',
                            active ? 'bg-white/[0.06] text-text' : 'text-text-dim hover:text-text',
                        )}
                    >
                        {t(`tab.${section}`)}
                    </TrackedLink>
                )
            })}
        </nav>
    )
}

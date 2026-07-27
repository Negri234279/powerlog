'use client'

import { useTranslations } from 'next-intl'

import { UnreadBadge } from '@/components/chat/unread-badge'
import { initials } from '@/lib/user-name'
import { TrackedLink } from '@/components/ui/tracked'
import { useConversationWith } from '@/lib/graphql/hooks/use-chat'

import type { RosterRow } from './use-roster'

/** How long a new athlete gets before "hasn't trained" becomes a problem. */
const GRACE_DAYS = 7

function isNew(row: RosterRow): boolean {
    if (!row.metrics || row.metrics.lastSessionAt !== null) return false

    const days = (Date.now() - new Date(row.metrics.coachedSince).getTime()) / 86_400_000

    return days <= GRACE_DAYS
}

/**
 * The athlete's identity cell, and the row's only link.
 *
 * The `after:absolute after:inset-0` overlay stretches this one anchor across
 * the whole row: a `<tr>` cannot be wrapped in an `<a>`, and giving every cell
 * its own link would make the row six tab stops instead of one. The `⋯`-style
 * controls that may sit in a row need `relative z-10` to stay clickable above it.
 *
 * The attention reason is repeated `sr-only` here so a screen reader hears the
 * problem next to the name, before any of the numbers — the ember edge that
 * conveys it visually is decorative and announced to no one.
 */
export function RosterIdentity({ row, reason }: { row: RosterRow; reason: string | null }) {
    const t = useTranslations('coaching.roster')
    const { conversation } = useConversationWith(row.user.userId)

    return (
        <span className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-xs uppercase text-text ring-1 ring-hairline">
                {row.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                    initials(row.user)
                )}
            </span>

            <span className="min-w-0">
                <TrackedLink
                    analyticsId="roster-athlete-open"
                    href={`/coaching/athletes/${row.user.userId}`}
                    aria-label={row.name ? `${row.name}, @${row.user.username}` : `@${row.user.username}`}
                    className="block truncate font-mono text-sm text-text after:absolute after:inset-0 after:content-['']"
                >
                    @{row.user.username}
                </TrackedLink>

                <span className="flex items-center gap-2">
                    {row.name ? <span className="block truncate text-xs text-text-dim">{row.name}</span> : null}
                    {isNew(row) ? (
                        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                            {t('new')}
                        </span>
                    ) : null}
                    {/* Above the row's stretched overlay link so it reads as its own chip. */}
                    <span className="relative z-10">
                        <UnreadBadge count={conversation?.unreadCount ?? 0} />
                    </span>
                </span>

                {reason ? <span className="sr-only">{reason}</span> : null}
            </span>
        </span>
    )
}

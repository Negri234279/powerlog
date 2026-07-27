'use client'

import { useFormatter, useNow, useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import type { Presence } from '@/lib/chat/chat-socket'

/**
 * The other participant's live status: a green dot + "Online" when connected,
 * otherwise a muted dot + relative last-seen ("Last seen 5 minutes ago").
 */
export function PresenceBadge({ presence }: { presence: Presence | undefined }) {
    const t = useTranslations('chat')
    const format = useFormatter()
    // A shared "now" so relativeTime doesn't fall back per-call (and stays stable
    // between the server render and hydration).
    const now = useNow()

    const online = presence?.online ?? false
    const label = online
        ? t('online')
        : presence?.lastSeenAt
          ? t('lastSeen', { time: format.relativeTime(new Date(presence.lastSeenAt), now) })
          : t('offline')

    return (
        <span className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className={cn('block size-2 shrink-0 rounded-full', online ? 'bg-pr' : 'bg-text-faint/50')} />
            {label}
        </span>
    )
}

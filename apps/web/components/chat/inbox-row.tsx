'use client'

import { useTranslations } from 'next-intl'

import { UnreadBadge } from '@/components/chat/unread-badge'
import { TrackedButton } from '@/components/ui/tracked'
import { useChatSocket } from '@/lib/chat/chat-socket'
import { cn } from '@/lib/cn'
import type { ChatConversation } from '@/lib/graphql/hooks/use-chat'

/**
 * One inbox row: avatar, handle, last-message preview ("You:" on own messages),
 * a live presence dot (socket overlay on the query's initial value) and the
 * unread badge. Shared by the full-page inbox and the floating chat widget.
 */
export function InboxRow({
    row,
    selected = false,
    meId,
    onSelect,
    className,
}: {
    row: ChatConversation
    selected?: boolean
    meId: string | undefined
    onSelect: () => void
    className?: string
}) {
    const t = useTranslations('chat')
    const socket = useChatSocket()
    const online = socket?.presenceOf(row.otherParticipantId)?.online ?? row.presence.online
    const name = row.otherParticipant.username

    const preview = row.lastMessage
        ? `${row.lastMessage.senderId === meId ? `${t('you')} ` : ''}${row.lastMessage.body}`
        : ''

    return (
        <TrackedButton
            analyticsId="chat-inbox-row"
            type="button"
            onClick={onSelect}
            className={cn(
                'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-white/[0.03]',
                selected && 'bg-white/[0.05]',
                className,
            )}
        >
            <span className="relative shrink-0">
                <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-xs uppercase text-text ring-1 ring-hairline">
                    {row.otherParticipant.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.otherParticipant.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                        name.slice(0, 2)
                    )}
                </span>
                {online ? (
                    <span className="absolute bottom-0 right-0 block size-2.5 rounded-full bg-pr ring-2 ring-surface" />
                ) : null}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm text-text">@{name}</span>
                {preview ? <span className="block truncate text-xs text-text-dim">{preview}</span> : null}
            </span>

            <UnreadBadge count={row.unreadCount} />
        </TrackedButton>
    )
}

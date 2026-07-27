'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Conversation } from '@/components/chat/conversation'
import { UnreadBadge } from '@/components/chat/unread-badge'
import { ChevronLeft, Spinner } from '@/components/ui/icons'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'
import { useChatSocket } from '@/lib/chat/chat-socket'
import { cn } from '@/lib/cn'
import { type ChatConversation, useChatConversations } from '@/lib/graphql/hooks/use-chat'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useMyAthletes, useMyCoaches } from '@/lib/graphql/hooks/use-coaching'

/** One inbox row: avatar, handle, last-message preview, presence dot, unread. */
function InboxRow({
    row,
    selected,
    meId,
    onSelect,
}: {
    row: ChatConversation
    selected: boolean
    meId: string | undefined
    onSelect: () => void
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

/**
 * The unified chat inbox — a master-detail: the conversation list on the left,
 * the open conversation on the right (side-by-side from `md`; on mobile the list
 * swaps to the conversation with a back link). Read-only when the counterpart is
 * no longer a live coach/athlete link (resolved from myCoaches ∪ myAthletes).
 */
export function ChatInboxView() {
    const t = useTranslations('chat')
    const { data: me } = useMe()
    const conversations = useChatConversations()
    const coaches = useMyCoaches()
    const athletes = useMyAthletes(me?.role === 'coach')
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const rows = conversations.data ?? []
    const linked = new Set<string>([
        ...(coaches.data ?? []).map((c) => c.userId),
        ...(athletes.data ?? []).map((a) => a.userId),
    ])
    const selected = rows.find((r) => r.conversationId === selectedId) ?? null

    return (
        <div className="space-y-6">
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('title')}</p>
                <h1 className="mt-3 font-display text-display">{t('inboxTitle')}</h1>
            </TextsReveal>

            <div className="grid h-[calc(100dvh-15rem)] min-h-[30rem] gap-4 md:grid-cols-[20rem_1fr]">
                {/* Conversation list */}
                <div
                    className={cn(
                        'min-h-0 overflow-y-auto rounded-2xl bg-surface ring-1 ring-hairline',
                        selected && 'hidden md:block',
                    )}
                >
                    {conversations.isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Spinner className="size-5 animate-spin text-text-faint" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex h-full items-center justify-center p-6">
                            <p className="text-center text-sm text-text-faint">{t('inboxEmpty')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-hairline">
                            {rows.map((row) => (
                                <InboxRow
                                    key={row.conversationId}
                                    row={row}
                                    selected={row.conversationId === selectedId}
                                    meId={me?.id}
                                    onSelect={() => setSelectedId(row.conversationId)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Open conversation */}
                <div className={cn('min-h-0', !selected && 'hidden md:block')}>
                    {selected ? (
                        <div className="flex h-full flex-col gap-2">
                            <TrackedButton
                                analyticsId="chat-inbox-back"
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="-ml-1 inline-flex items-center gap-1 self-start rounded-full px-2 py-1 text-sm text-text-dim transition-colors duration-300 hover:text-text md:hidden"
                            >
                                <ChevronLeft className="size-4" />
                                {t('back')}
                            </TrackedButton>
                            <Conversation
                                className="flex-1"
                                conversationId={selected.conversationId}
                                otherParticipantId={selected.otherParticipantId}
                                otherName={selected.otherParticipant.username}
                                otherAvatarUrl={selected.otherParticipant.avatarUrl}
                                initialPresence={selected.presence}
                                readOnly={!linked.has(selected.otherParticipantId)}
                            />
                        </div>
                    ) : (
                        <div className="hidden h-full place-items-center rounded-2xl bg-surface ring-1 ring-hairline md:grid">
                            <p className="text-sm text-text-faint">{t('selectConversation')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

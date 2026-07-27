'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { Conversation } from '@/components/chat/conversation'
import { InboxRow } from '@/components/chat/inbox-row'
import { UnreadBadge } from '@/components/chat/unread-badge'
import { ChatBubble, ChevronLeft, Close, Spinner } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { useChatConversations, useLinkedCounterpartIds } from '@/lib/graphql/hooks/use-chat'
import { useMe } from '@/lib/graphql/hooks/use-auth'

/**
 * Global chat launcher — a Messenger-style bubble fixed bottom-right on every
 * authed page. Opening it shows the conversation list; picking one opens that
 * thread in the same popup (← back to the list). Full-page messaging still lives
 * at `/chat`; this is the quick, always-there entry. Hidden on `/chat` itself to
 * avoid two chat surfaces at once.
 */
export function ChatWidget() {
    const t = useTranslations('chat')
    const pathname = usePathname()
    const { data: me } = useMe()
    const conversations = useChatConversations(Boolean(me))
    const linked = useLinkedCounterpartIds()
    const [open, setOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const rows = conversations.data ?? []
    const totalUnread = rows.reduce((sum, c) => sum + c.unreadCount, 0)
    const selected = rows.find((r) => r.conversationId === selectedId) ?? null

    // The /chat tab is the full-page inbox — don't stack the widget on top of it.
    if (!me || pathname.startsWith('/chat')) return null

    return (
        <>
            {open ? (
                <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface ring-1 ring-hairline sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[32rem] sm:w-[22rem] sm:rounded-2xl sm:shadow-2xl">
                    {selected ? (
                        <>
                            <div className="flex items-center gap-1 border-b border-hairline px-2 py-1.5">
                                <TrackedButton
                                    analyticsId="chat-widget-back"
                                    type="button"
                                    onClick={() => setSelectedId(null)}
                                    aria-label={t('back')}
                                    className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:text-text"
                                >
                                    <ChevronLeft className="size-4" />
                                </TrackedButton>
                                <span className="flex-1" />
                                <TrackedButton
                                    analyticsId="chat-widget-close"
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label={t('close')}
                                    className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:text-text"
                                >
                                    <Close className="size-4" />
                                </TrackedButton>
                            </div>
                            <Conversation
                                bare
                                className="min-h-0 flex-1"
                                conversationId={selected.conversationId}
                                otherParticipantId={selected.otherParticipantId}
                                otherName={selected.otherParticipant.username}
                                otherAvatarUrl={selected.otherParticipant.avatarUrl}
                                initialPresence={selected.presence}
                                readOnly={!linked.has(selected.otherParticipantId)}
                            />
                        </>
                    ) : (
                        <>
                            <div className="flex items-center border-b border-hairline px-4 py-3">
                                <span className="flex-1 font-display text-base tracking-tight">{t('inboxTitle')}</span>
                                <TrackedButton
                                    analyticsId="chat-widget-close"
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label={t('close')}
                                    className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:text-text"
                                >
                                    <Close className="size-4" />
                                </TrackedButton>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
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
                                                meId={me.id}
                                                onSelect={() => setSelectedId(row.conversationId)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <TrackedButton
                    analyticsId="chat-widget-open"
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label={t('openChat')}
                    className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-ember-gradient text-bg glow-ember transition-transform duration-300 ease-spring active:scale-95"
                >
                    <ChatBubble className="size-6" />
                    {totalUnread > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5">
                            <UnreadBadge count={totalUnread} />
                        </span>
                    ) : null}
                </TrackedButton>
            )}
        </>
    )
}

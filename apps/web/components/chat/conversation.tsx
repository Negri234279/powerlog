'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Composer } from '@/components/chat/composer'
import { MessageList } from '@/components/chat/message-list'
import { PresenceBadge } from '@/components/chat/presence-badge'
import type { Presence } from '@/lib/chat/chat-socket'
import { useConversation } from '@/lib/chat/use-conversation'
import { cn } from '@/lib/cn'

/** Small round avatar: the image when present, else the handle initials. */
function Avatar({ name, src }: { name: string; src?: string | null }) {
    return (
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-xs uppercase text-text ring-1 ring-hairline">
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-full object-cover" />
            ) : (
                name.slice(0, 2)
            )}
        </span>
    )
}

/**
 * A full coach↔athlete conversation: identity + live presence header, the
 * message history (merged with live socket events), and the composer — or a
 * read-only notice when the link is gone (history stays visible; nobody can send).
 * Sizes to its parent (`h-full`), so it drops into the athlete page full-width or
 * the coach's rail column unchanged.
 */
export function Conversation({
    conversationId,
    otherParticipantId,
    otherName,
    otherAvatarUrl,
    initialPresence,
    readOnly = false,
    className,
}: {
    conversationId: string
    otherParticipantId: string
    otherName: string
    otherAvatarUrl?: string | null
    initialPresence?: Presence
    readOnly?: boolean
    className?: string
}) {
    const t = useTranslations('chat')
    const locale = useLocale()
    const convo = useConversation(conversationId, otherParticipantId, initialPresence)

    return (
        <div
            className={cn(
                'flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-hairline',
                className,
            )}
        >
            <header className="flex items-center gap-3 border-b border-hairline px-4 py-3">
                <Avatar name={otherName} src={otherAvatarUrl} />
                <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-text">@{otherName}</p>
                    {convo.otherTyping ? (
                        <span className="text-xs text-ember">{t('typing')}</span>
                    ) : (
                        <PresenceBadge presence={convo.presence} />
                    )}
                </div>
            </header>

            <MessageList
                messages={convo.messages}
                meId={convo.meId}
                otherTyping={convo.otherTyping}
                isLoading={convo.isLoading}
                hasOlder={convo.hasOlder}
                isLoadingOlder={convo.isLoadingOlder}
                loadOlder={convo.loadOlder}
                locale={locale}
            />

            {readOnly ? (
                <p className="border-t border-hairline px-4 py-4 text-center text-xs text-text-faint">
                    {t('readOnly')}
                </p>
            ) : (
                <Composer onSend={convo.send} onTyping={convo.notifyTyping} />
            )}
        </div>
    )
}

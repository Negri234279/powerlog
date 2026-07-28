'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { MessageBubble } from '@/components/chat/message-bubble'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { Spinner } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import type { ChatMessage } from '@/lib/graphql/hooks/use-chat'

export function MessageList({
    messages,
    meId,
    otherTyping,
    isLoading,
    hasOlder,
    isLoadingOlder,
    loadOlder,
    locale,
}: {
    messages: ChatMessage[]
    meId: string | undefined
    otherTyping: boolean
    isLoading: boolean
    hasOlder: boolean
    isLoadingOlder: boolean
    loadOlder: () => void
    locale: string
}) {
    const t = useTranslations('chat')
    const bottomRef = useRef<HTMLDivElement>(null)

    // Stick to the bottom as new messages (or the typing indicator) arrive.
    const lastId = messages.at(-1)?.id
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' })
    }, [lastId, otherTyping])

    return (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
            {hasOlder ? (
                <div className="flex justify-center pb-2">
                    <TrackedButton
                        analyticsId="chat-load-older"
                        type="button"
                        onClick={loadOlder}
                        disabled={isLoadingOlder}
                        className="rounded-full px-3 py-1 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                    >
                        {isLoadingOlder ? <Spinner className="size-3.5 animate-spin" /> : t('loadOlder')}
                    </TrackedButton>
                </div>
            ) : null}

            {isLoading && messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <Spinner className="size-5 animate-spin text-text-faint" />
                </div>
            ) : messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-text-faint">{t('empty')}</p>
                </div>
            ) : (
                messages.map((message, i) => {
                    const next = messages[i + 1]
                    const tail = !next || next.senderId !== message.senderId
                    return (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            mine={message.senderId === meId}
                            tail={tail}
                            locale={locale}
                        />
                    )
                })
            )}

            {otherTyping ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
        </div>
    )
}

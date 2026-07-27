'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { type Presence, useChatSocket } from '@/lib/chat/chat-socket'
import { type ChatMessage, useChatMessages } from '@/lib/graphql/hooks/use-chat'
import { useMe } from '@/lib/graphql/hooks/use-auth'

/** Emit "typing…" at most this often while the user keeps typing. */
const TYPING_THROTTLE_MS = 3_000

export interface Conversation {
    /** Messages oldest-first, ready to render top → bottom. */
    messages: ChatMessage[]
    isLoading: boolean
    hasOlder: boolean
    isLoadingOlder: boolean
    loadOlder: () => void
    /** The other participant's presence (live over the socket, else the initial value). */
    presence: Presence | undefined
    /** Whether the other participant is typing right now. */
    otherTyping: boolean
    /** Whether the live socket is connected (composer still works via GraphQL if not). */
    connected: boolean
    /** The viewer's id, to align bubbles and read own-message receipts. */
    meId: string | undefined
    send: (body: string) => Promise<void>
    notifyTyping: () => void
}

/**
 * A live conversation: the GraphQL history (keyset-paginated) merged with the
 * socket's live events (new messages, cursor ticks, typing, presence). Joins the
 * conversation room on mount, marks it read as messages from the other side land,
 * and exposes a `send` that prefers the socket.
 */
export function useConversation(
    conversationId: string | undefined,
    otherParticipantId: string | undefined,
    initialPresence?: Presence,
): Conversation {
    const socket = useChatSocket()
    const { data: me } = useMe()
    const meId = me?.id

    const query = useChatMessages(conversationId ?? '', Boolean(conversationId))

    // Join the conversation room (for typing) while this view is mounted.
    useEffect(() => {
        if (!conversationId || !socket) return
        socket.join(conversationId)
        return () => socket.leave(conversationId)
    }, [conversationId, socket])

    // Pages arrive newest-first (and items within a page too); flatten + reverse so
    // the list renders oldest at the top, newest at the bottom.
    const messages = useMemo(() => {
        const pages = query.data?.pages ?? []
        return pages
            .flatMap((page) => page.items)
            .slice()
            .reverse()
    }, [query.data])

    // Mark read whenever the newest message is from the other side.
    const lastId = messages.at(-1)?.id
    const lastSenderId = messages.at(-1)?.senderId
    useEffect(() => {
        if (!conversationId || !socket || !lastId) return
        if (lastSenderId && lastSenderId !== meId) socket.markRead(conversationId)
    }, [conversationId, socket, lastId, lastSenderId, meId])

    const presence = (otherParticipantId ? socket?.presenceOf(otherParticipantId) : undefined) ?? initialPresence
    const otherTyping = conversationId ? (socket?.typingUsers(conversationId).length ?? 0) > 0 : false

    const send = useCallback(
        async (body: string): Promise<void> => {
            if (!conversationId || !socket) return
            await socket.send(conversationId, body)
        },
        [conversationId, socket],
    )

    const lastTypingAt = useRef(0)
    const notifyTyping = useCallback(() => {
        if (!conversationId || !socket) return
        const now = Date.now()
        if (now - lastTypingAt.current < TYPING_THROTTLE_MS) return
        lastTypingAt.current = now
        socket.sendTyping(conversationId)
    }, [conversationId, socket])

    return {
        messages,
        isLoading: query.isLoading,
        hasOlder: Boolean(query.hasNextPage),
        isLoadingOlder: query.isFetchingNextPage,
        loadOlder: () => void query.fetchNextPage(),
        presence,
        otherTyping,
        connected: socket?.connected ?? false,
        meId,
        send,
        notifyTyping,
    }
}

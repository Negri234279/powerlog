'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { env } from '@/lib/env'
import { gqlRequest } from '@/lib/graphql/client'
import {
    advanceMessageStatuses,
    appendMessageToCache,
    CHAT_CONVERSATIONS_KEY,
    type ChatConversation,
    type ChatMessage,
} from '@/lib/graphql/hooks/use-chat'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { MarkConversationReadDocument, SendChatMessageDocument } from '@/lib/graphql/operations/chat'

/** The other participant's presence as it arrives live. */
export interface Presence {
    online: boolean
    lastSeenAt: string | null
}

interface WireMessage {
    id: string
    conversationId: string
    senderId: string
    kind: string
    body: string
    createdAt: string
}
interface CursorEvent {
    conversationId: string
    userId: string
    messageId: string
}
interface TypingEvent {
    conversationId: string
    userId: string
}
interface PresenceEvent {
    userId: string
    online: boolean
    lastSeenAt: string | null
}
type SendAck = { ok: true; message: WireMessage } | { ok: false; code: string }

/** Thrown by `send` when the server rejects a message (e.g. read-only after unlink). */
export class ChatSendError extends Error {
    constructor(readonly code: string) {
        super(code)
        this.name = 'ChatSendError'
    }
}

interface ChatSocketValue {
    connected: boolean
    presenceOf(userId: string): Presence | undefined
    typingUsers(conversationId: string): string[]
    join(conversationId: string): void
    leave(conversationId: string): void
    sendTyping(conversationId: string): void
    send(conversationId: string, body: string): Promise<void>
    markRead(conversationId: string): void
}

const ChatSocketContext = createContext<ChatSocketValue | null>(null)

/** How long a "typing…" indicator lingers without a refresh (matches the plan). */
const TYPING_TTL_MS = 6_000

/**
 * One Socket.IO connection per tab — the realtime channel for presence + live
 * chat, mounted once in the authed shell (parallel to `useRealtime`'s SSE). It
 * connects directly to the API (`NEXT_PUBLIC_WS_URL`) with the auth cookie, and
 * folds incoming events into the React Query caches so open conversations, the
 * inbox and the presence dots update without a refetch.
 *
 * Writes go over the socket when connected (with an ack) and fall back to the
 * GraphQL mutation otherwise — the socket is the fast path, GraphQL the safety net.
 */
export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
    const { data: me } = useMe()
    const meId = me?.id
    const qc = useQueryClient()

    const socketRef = useRef<Socket | null>(null)
    const [connected, setConnected] = useState(false)
    const [presence, setPresence] = useState<Map<string, Presence>>(new Map())
    const [typing, setTyping] = useState<Record<string, string[]>>({})
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    useEffect(() => {
        if (!meId) return

        const socket = io(env.wsUrl, {
            path: '/ws',
            transports: ['websocket'],
            withCredentials: true,
        })
        socketRef.current = socket

        socket.on('connect', () => setConnected(true))
        socket.on('disconnect', () => setConnected(false))

        socket.on('chat:message', (wire: WireMessage) => {
            const message: ChatMessage = { ...wire, status: wire.senderId === meId ? 'sent' : null }
            appendMessageToCache(qc, wire.conversationId, message)
            // Unread counts + last-message preview are authoritative on the server.
            void qc.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY })
        })

        socket.on('chat:read', (e: CursorEvent) =>
            advanceMessageStatuses(qc, e.conversationId, meId, e.messageId, 'read'),
        )
        socket.on('chat:delivered', (e: CursorEvent) =>
            advanceMessageStatuses(qc, e.conversationId, meId, e.messageId, 'delivered'),
        )

        socket.on('presence:update', (e: PresenceEvent) => {
            setPresence((prev) => new Map(prev).set(e.userId, { online: e.online, lastSeenAt: e.lastSeenAt }))
        })

        const timers = typingTimers.current
        socket.on('chat:typing', (e: TypingEvent) => {
            const key = `${e.conversationId}:${e.userId}`
            const existing = timers.get(key)
            if (existing) clearTimeout(existing)

            setTyping((prev) => {
                const users = new Set(prev[e.conversationId] ?? [])
                users.add(e.userId)
                return { ...prev, [e.conversationId]: [...users] }
            })

            timers.set(
                key,
                setTimeout(() => {
                    timers.delete(key)
                    setTyping((prev) => ({
                        ...prev,
                        [e.conversationId]: (prev[e.conversationId] ?? []).filter((u) => u !== e.userId),
                    }))
                }, TYPING_TTL_MS),
            )
        })

        return () => {
            for (const timer of timers.values()) clearTimeout(timer)
            timers.clear()
            socket.disconnect()
            socketRef.current = null
            setConnected(false)
        }
    }, [meId, qc])

    const join = useCallback((conversationId: string) => {
        socketRef.current?.emit('chat:join', { conversationId })
    }, [])

    const leave = useCallback((conversationId: string) => {
        socketRef.current?.emit('chat:leave', { conversationId })
    }, [])

    const sendTyping = useCallback((conversationId: string) => {
        socketRef.current?.emit('chat:typing', { conversationId })
    }, [])

    const send = useCallback(
        async (conversationId: string, body: string): Promise<void> => {
            const socket = socketRef.current
            if (socket?.connected) {
                const ack = await new Promise<SendAck>((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error('chat send timed out')), 10_000)
                    socket.emit('chat:send', { conversationId, body }, (res: SendAck) => {
                        clearTimeout(timer)
                        resolve(res)
                    })
                })
                if (!ack.ok) throw new ChatSendError(ack.code)

                appendMessageToCache(qc, conversationId, { ...ack.message, status: 'sent' })
                return
            }

            // Fallback: the socket isn't connected — persist over GraphQL. The other
            // side gets it on their next refetch/reconnect.
            const { sendChatMessage } = await gqlRequest(SendChatMessageDocument, { conversationId, body })
            appendMessageToCache(qc, conversationId, sendChatMessage)
        },
        [qc],
    )

    const markRead = useCallback(
        (conversationId: string) => {
            // Optimistically clear the badge; the server's push will reconcile it.
            qc.setQueryData<ChatConversation[]>(CHAT_CONVERSATIONS_KEY, (old) =>
                old?.map((row) => (row.conversationId === conversationId ? { ...row, unreadCount: 0 } : row)),
            )

            const socket = socketRef.current
            if (socket?.connected) socket.emit('chat:read-ack', { conversationId })
            else void gqlRequest(MarkConversationReadDocument, { conversationId }).catch(() => undefined)
        },
        [qc],
    )

    const value = useMemo<ChatSocketValue>(
        () => ({
            connected,
            presenceOf: (userId) => presence.get(userId),
            typingUsers: (conversationId) => typing[conversationId] ?? [],
            join,
            leave,
            sendTyping,
            send,
            markRead,
        }),
        [connected, presence, typing, join, leave, sendTyping, send, markRead],
    )

    return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
}

/** Access the chat socket. Returns null outside the provider (e.g. unauthed). */
export function useChatSocket(): ChatSocketValue | null {
    return useContext(ChatSocketContext)
}

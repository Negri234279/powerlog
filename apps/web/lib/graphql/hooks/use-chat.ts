import { type InfiniteData, useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import type { ListChatConversationsQuery, ListChatMessagesQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useMyAthletes, useMyCoaches } from '@/lib/graphql/hooks/use-coaching'
import { ListChatConversationsDocument, ListChatMessagesDocument } from '@/lib/graphql/operations/chat'

export type ChatConversation = ListChatConversationsQuery['listChatConversations'][number]
export type ChatMessagesPage = ListChatMessagesQuery['listChatMessages']
export type ChatMessage = ChatMessagesPage['items'][number]

const PAGE_SIZE = 30

export const CHAT_CONVERSATIONS_KEY = ['chat', 'conversations'] as const
export const chatMessagesKey = (conversationId: string) => ['chat', 'messages', conversationId] as const

/** The caller's chat inbox: one row per conversation, most recent first. */
export function useChatConversations(enabled = true) {
    return useQuery({
        queryKey: CHAT_CONVERSATIONS_KEY,
        queryFn: async () => (await gqlRequest(ListChatConversationsDocument)).listChatConversations,
        enabled,
        retry: false,
    })
}

/**
 * The inbox row for the conversation with one counterpart (a coach or athlete),
 * resolved by their user id — the entry point both placements use to turn a
 * counterpart into a conversation id + its presence + unread count. `undefined`
 * while loading or when no conversation exists yet.
 */
export function useConversationWith(otherParticipantId: string, enabled = true) {
    const query = useChatConversations(enabled)
    const conversation = query.data?.find((row) => row.otherParticipantId === otherParticipantId)

    return { conversation, isLoading: query.isLoading }
}

/**
 * The ids of everyone the caller is currently linked to (their coaches ∪ their
 * athletes). A conversation whose counterpart is NOT in this set is read-only —
 * the link is broken, history stays but nobody can send.
 */
export function useLinkedCounterpartIds(): Set<string> {
    const { data: me } = useMe()
    const coaches = useMyCoaches()
    const athletes = useMyAthletes(me?.role === 'coach')

    return new Set<string>([
        ...(coaches.data ?? []).map((c) => c.userId),
        ...(athletes.data ?? []).map((a) => a.userId),
    ])
}

/**
 * A conversation's messages, keyset-paginated newest-first. Pages arrive newest
 * → oldest; the view flattens + reverses them to render oldest at the top. Live
 * socket messages are merged into page 0 by the chat socket provider.
 */
export function useChatMessages(conversationId: string, enabled = true) {
    return useInfiniteQuery({
        queryKey: chatMessagesKey(conversationId),
        queryFn: async ({ pageParam }) =>
            (
                await gqlRequest(ListChatMessagesDocument, {
                    conversationId,
                    limit: PAGE_SIZE,
                    cursor: pageParam ?? undefined,
                })
            ).listChatMessages,
        initialPageParam: null as string | null,
        getNextPageParam: (last) => (last.hasNextPage ? last.nextCursor : undefined),
        enabled,
        retry: false,
    })
}

type MessagesCache = InfiniteData<ChatMessagesPage, string | null>

/** Whether key `a` is at or before key `b` under the (createdAt, id) ordering.
 *  ISO strings compare lexicographically, matching the server's keyset. */
function atOrBefore(a: { createdAt: string; id: string }, b: { createdAt: string; id: string }): boolean {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt
    return a.id <= b.id
}

/** Merge a live message into page 0 (newest first), de-duplicated by id. */
export function appendMessageToCache(qc: QueryClient, conversationId: string, message: ChatMessage): void {
    qc.setQueryData<MessagesCache>(chatMessagesKey(conversationId), (old) => {
        if (!old || old.pages.length === 0) return old
        if (old.pages.some((page) => page.items.some((item) => item.id === message.id))) return old

        const [newest, ...rest] = old.pages
        return { ...old, pages: [{ ...newest!, items: [message, ...newest!.items] }, ...rest] }
    })
}

/**
 * Advance the double-check on the viewer's own messages up to `messageId` when the
 * other side's read/delivered cursor moves (a live `chat:read`/`chat:delivered`).
 */
export function advanceMessageStatuses(
    qc: QueryClient,
    conversationId: string,
    viewerId: string,
    messageId: string,
    status: 'delivered' | 'read',
): void {
    qc.setQueryData<MessagesCache>(chatMessagesKey(conversationId), (old) => {
        if (!old) return old

        const boundary = old.pages.flatMap((page) => page.items).find((item) => item.id === messageId)
        if (!boundary) return old

        return {
            ...old,
            pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                    item.senderId === viewerId && item.status !== 'read' && atOrBefore(item, boundary)
                        ? { ...item, status }
                        : item,
                ),
            })),
        }
    })
}

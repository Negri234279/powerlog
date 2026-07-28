import { graphql } from '@/lib/graphql/__generated__'

/** The caller's chat inbox: one row per conversation, most recent first. */
export const ListChatConversationsDocument = graphql(`
    query ListChatConversations {
        listChatConversations {
            conversationId
            otherParticipantId
            unreadCount
            otherParticipant {
                username
                avatarUrl
            }
            presence {
                online
                lastSeenAt
            }
            lastMessage {
                id
                senderId
                body
                createdAt
            }
        }
    }
`)

/** One page of a conversation's messages, newest first (keyset-paginated). */
export const ListChatMessagesDocument = graphql(`
    query ListChatMessages($conversationId: ID!, $limit: Int, $cursor: String) {
        listChatMessages(conversationId: $conversationId, limit: $limit, cursor: $cursor) {
            hasNextPage
            nextCursor
            items {
                id
                conversationId
                senderId
                kind
                body
                createdAt
                status
            }
        }
    }
`)

export const SendChatMessageDocument = graphql(`
    mutation SendChatMessage($conversationId: ID!, $body: String!) {
        sendChatMessage(conversationId: $conversationId, body: $body) {
            id
            conversationId
            senderId
            kind
            body
            createdAt
            status
        }
    }
`)

export const MarkConversationReadDocument = graphql(`
    mutation MarkConversationRead($conversationId: ID!) {
        markConversationRead(conversationId: $conversationId)
    }
`)

export const MarkConversationDeliveredDocument = graphql(`
    mutation MarkConversationDelivered($conversationId: ID!) {
        markConversationDelivered(conversationId: $conversationId)
    }
`)

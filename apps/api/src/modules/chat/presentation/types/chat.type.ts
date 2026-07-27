import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

/** Double-check state of a message the caller sent, derived from the other side. */
export enum ChatReadStatus {
    sent = 'sent',
    delivered = 'delivered',
    read = 'read',
}

registerEnumType(ChatReadStatus, {
    name: 'ChatReadStatus',
    description: 'Delivery state of a sent message: sent, delivered, or read.',
})

/** A chat message as exposed over GraphQL. */
@ObjectType('ChatMessage')
export class ChatMessageType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    conversationId!: string

    @Field(() => ID)
    senderId!: string

    @Field(() => String, { description: 'Message kind; "text" in v1.' })
    kind!: string

    @Field(() => String)
    body!: string

    @Field()
    createdAt!: Date

    @Field(() => ChatReadStatus, {
        nullable: true,
        description: 'Double-check for the caller’s own messages; null for received ones.',
    })
    status?: ChatReadStatus | null
}

/** One keyset page of a conversation's messages, newest first. */
@ObjectType('ChatMessagesPage')
export class ChatMessagesPageType {
    @Field(() => [ChatMessageType])
    items!: ChatMessageType[]

    @Field(() => String, { nullable: true, description: 'Cursor for the next page; null when last.' })
    nextCursor?: string | null

    @Field()
    hasNextPage!: boolean
}

/** The last message of a conversation, for the inbox preview. */
@ObjectType('ChatMessagePreview')
export class ChatMessagePreviewType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    senderId!: string

    @Field(() => String)
    body!: string

    @Field()
    createdAt!: Date
}

/** The other participant's presence: online now + durable last-seen. */
@ObjectType('ChatPresence')
export class ChatPresenceType {
    @Field({ description: 'Whether the other participant has a live socket open right now.' })
    online!: boolean

    @Field(() => Date, { nullable: true, description: 'When they were last seen; null if never.' })
    lastSeenAt?: Date | null
}

/** One inbox row: a conversation from the caller's side. */
@ObjectType('ChatConversation')
export class ChatConversationType {
    @Field(() => ID)
    conversationId!: string

    @Field(() => ID, { description: 'The coach (athlete viewer) or athlete (coach viewer).' })
    otherParticipantId!: string

    @Field(() => ChatMessagePreviewType, { nullable: true, description: 'Null when no messages yet.' })
    lastMessage?: ChatMessagePreviewType | null

    @Field(() => Int, { description: 'Messages from the other party past the caller’s read cursor.' })
    unreadCount!: number

    @Field(() => ChatPresenceType, { description: 'Live presence of the other participant.' })
    presence!: ChatPresenceType
}

import type { MessageKind } from '../message-kind'
import { MessageBodyVO } from '../value-objects/message-body.vo'

export interface MessageProps {
    id: string
    conversationId: string
    senderId: string
    kind: MessageKind
    body: string
    createdAt: Date
}

/**
 * `MessageEntity` — a single chat message. Plain entity (no domain events; chat
 * has no rich aggregate — same ceremony as `NotificationEntity`). `senderId` is a
 * soft reference to the auth user. The body is validated through {@link MessageBodyVO}.
 * Attachment columns exist in persistence but are unused in v1 (text only).
 */
export class MessageEntity {
    private constructor(private readonly props: MessageProps) {}

    /**
     * Create a fresh text message. `body` is validated + trimmed via the VO, so a
     * constructed message is always valid.
     */
    static create(input: {
        id: string
        conversationId: string
        senderId: string
        body: string
        now: Date
    }): MessageEntity {
        const body = MessageBodyVO.create(input.body)

        return new MessageEntity({
            id: input.id,
            conversationId: input.conversationId,
            senderId: input.senderId,
            kind: 'text',
            body: body.value,
            createdAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: MessageProps): MessageEntity {
        return new MessageEntity(props)
    }

    get id(): string {
        return this.props.id
    }

    get conversationId(): string {
        return this.props.conversationId
    }

    get senderId(): string {
        return this.props.senderId
    }

    get kind(): MessageKind {
        return this.props.kind
    }

    get body(): string {
        return this.props.body
    }

    get createdAt(): Date {
        return this.props.createdAt
    }
}

import { MessageEntity } from '../../../src/modules/chat/domain/entities/message.entity'

const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for messages. Fluent builder with sane defaults:
 *   MessageMother.create().from("coach-1").in("conv-1").withBody("hi").build()
 * Bodies are generic test text only — never real user content.
 */
export class MessageMother {
    private id = 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm'
    private conversationId = 'conv-1'
    private senderId = 'coach-1'
    private body = 'test message'
    private createdAt = DEFAULT_NOW

    static create(): MessageMother {
        return new MessageMother()
    }

    withId(id: string): this {
        this.id = id
        return this
    }

    in(conversationId: string): this {
        this.conversationId = conversationId
        return this
    }

    from(senderId: string): this {
        this.senderId = senderId
        return this
    }

    withBody(body: string): this {
        this.body = body
        return this
    }

    createdAtTime(at: Date): this {
        this.createdAt = at
        return this
    }

    build(): MessageEntity {
        return MessageEntity.rehydrate({
            id: this.id,
            conversationId: this.conversationId,
            senderId: this.senderId,
            kind: 'text',
            body: this.body,
            createdAt: this.createdAt,
        })
    }
}

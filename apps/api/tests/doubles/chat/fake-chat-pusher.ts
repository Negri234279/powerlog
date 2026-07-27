import { ChatPusher } from '../../../src/modules/chat/application/ports/chat-pusher.port'
import type { MessageEntity } from '../../../src/modules/chat/domain/entities/message.entity'

interface PostedPush {
    conversationId: string
    recipientIds: string[]
    message: MessageEntity
}

interface CursorPush {
    conversationId: string
    userId: string
    recipientIds: string[]
    kind: 'delivered' | 'read'
    messageId: string
}

/**
 * Records what would have been pushed, without any gateway. Lets application
 * tests assert the live fan-out was requested (recipients, message) without a
 * real transport — the FakeChatPusher of the plan.
 */
export class FakeChatPusher extends ChatPusher {
    readonly posted: PostedPush[] = []
    readonly cursors: CursorPush[] = []

    async messagePosted(input: PostedPush): Promise<void> {
        this.posted.push(input)
    }

    async cursorAdvanced(input: CursorPush): Promise<void> {
        this.cursors.push(input)
    }
}

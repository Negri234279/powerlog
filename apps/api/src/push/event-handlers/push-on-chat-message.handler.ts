import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { OnlineRegistry } from '../../presence/online/online-registry'
import { UserDirectory } from '../../shared/contracts/user-directory'
import { ChatMessageSentIntegrationEvent } from '../../shared/integration-events/chat-message-sent.integration-event'
import { PushCopy } from '../push-copy'
import { PushNotifier } from '../push-notifier'

/**
 * Pushes the recipient of a chat message — but only when they're NOT connected
 * over the realtime socket. If they're online they already see it live (WS +
 * GraphQL), and a push on top would double-notify. The presence check is the
 * shared `OnlineRegistry` the gateway keeps, so "online in any tab" is honoured.
 * The deep link points at whichever side of the conversation the recipient is on.
 */
@EventsHandler(ChatMessageSentIntegrationEvent)
export class PushOnChatMessage implements IEventHandler<ChatMessageSentIntegrationEvent> {
    constructor(
        private readonly push: PushNotifier,
        private readonly online: OnlineRegistry,
        private readonly users: UserDirectory,
    ) {}

    async handle(event: ChatMessageSentIntegrationEvent): Promise<void> {
        const recipientId = event.senderId === event.coachId ? event.athleteId : event.coachId

        // Online in some tab ⇒ they get it live; don't push.
        if (await this.online.isOnline(recipientId)) return

        const sender = await this.users.getContact(event.senderId)
        const senderName = sender?.username ?? ''

        // The recipient opens the thread from their own side: a coach views the
        // athlete, an athlete views the coach.
        const url =
            recipientId === event.coachId
                ? `/coaching/athletes/${event.athleteId}`
                : `/coaching/coaches/${event.coachId}`

        await this.push.send([recipientId], PushCopy.chatMessage(senderName, event.preview, url, event.conversationId))
    }
}

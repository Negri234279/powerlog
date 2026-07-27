import { Injectable } from '@nestjs/common'

import { ChatPusher } from '../../application/ports/chat-pusher.port'

/**
 * No-op `ChatPusher` for Chat.1 — there's no WebSocket gateway yet, so live
 * pushes go nowhere and clients rely entirely on GraphQL. Chat.2 replaces this
 * binding with the Socket.IO gateway; the command handlers don't change.
 */
@Injectable()
export class NullChatPusher extends ChatPusher {
    async messagePosted(): Promise<void> {
        // Intentionally does nothing until Chat.2 wires the gateway.
    }

    async cursorAdvanced(): Promise<void> {
        // Intentionally does nothing until Chat.2 wires the gateway.
    }
}

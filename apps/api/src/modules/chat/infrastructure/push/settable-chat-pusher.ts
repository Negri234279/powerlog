import { Injectable } from '@nestjs/common'

import { ChatPusher } from '../../application/ports/chat-pusher.port'

/**
 * A `ChatPusher` whose real implementation (the WebSocket gateway) is registered
 * at runtime. This breaks the module cycle: the chat command handlers depend on
 * `ChatPusher`, and the gateway depends on the CommandBus — so the gateway can't
 * be a compile-time provider of `ChatPusher`. Instead it calls `setDelegate(this)`
 * on init. Until then (Chat.1 shape, or tests without a gateway) pushes are no-ops.
 */
@Injectable()
export class SettableChatPusher extends ChatPusher {
    private delegate: ChatPusher | null = null

    setDelegate(delegate: ChatPusher): void {
        this.delegate = delegate
    }

    async messagePosted(input: Parameters<ChatPusher['messagePosted']>[0]): Promise<void> {
        await this.delegate?.messagePosted(input)
    }

    async cursorAdvanced(input: Parameters<ChatPusher['cursorAdvanced']>[0]): Promise<void> {
        await this.delegate?.cursorAdvanced(input)
    }
}

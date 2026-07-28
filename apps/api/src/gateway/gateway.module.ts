import { Module } from '@nestjs/common'

import { AuthModule } from '../modules/auth/auth.module'
import { ChatModule } from '../modules/chat/chat.module'
import { PresenceModule } from '../presence/presence.module'
import { ChatGateway } from './chat.gateway'

/**
 * The WebSocket transport (Socket.IO), outside `src/modules` like `src/realtime`.
 * Wires the single gateway to the CommandBus (global) and to the chat/presence
 * modules' settable pushers, which it registers itself into on init — so chat and
 * presence never import the transport.
 */
@Module({
    // AuthModule → TokenSigner (handshake). ChatModule → SettableChatPusher.
    // PresenceModule → PresenceService + SettablePresenceBroadcaster. CqrsModule
    // (CommandBus/QueryBus) and RedisModule are global.
    imports: [AuthModule, ChatModule, PresenceModule],
    providers: [ChatGateway],
})
export class GatewayModule {}

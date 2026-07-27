import { Module, type Provider } from '@nestjs/common'

import { QueryBusProfileSnapshotReader } from '../../account/query-bus-profile-snapshot-reader'
import { PresenceReadModule } from '../../presence/presence-read.module'
import { ProfileSnapshotReader } from '../../shared/contracts/profile-snapshot-reader'
import { AuthModule } from '../auth/auth.module'
import { CoachingModule } from '../coaching/coaching.module'
import { CHAT_COMMAND_HANDLERS, CHAT_EVENT_HANDLERS, CHAT_QUERY_HANDLERS } from './application/chat.application'
import { ChatInboxReadModel } from './application/ports/chat-inbox.read-model'
import { ChatPusher } from './application/ports/chat-pusher.port'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { ConversationRepository } from './domain/repositories/conversation.repository'
import { MessageRepository } from './domain/repositories/message.repository'
import { ParticipantStateRepository } from './domain/repositories/participant-state.repository'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { DrizzleChatInboxReadModel } from './infrastructure/persistence/read-models/drizzle-chat-inbox.read-model'
import { DrizzleConversationRepository } from './infrastructure/persistence/repositories/drizzle-conversation.repository'
import { DrizzleMessageRepository } from './infrastructure/persistence/repositories/drizzle-message.repository'
import { DrizzleParticipantStateRepository } from './infrastructure/persistence/repositories/drizzle-participant-state.repository'
import { SettableChatPusher } from './infrastructure/push/settable-chat-pusher'
import { SystemClock } from './infrastructure/time/system-clock'
import { CHAT_RESOLVERS } from './presentation/chat.presentation'

/** Binds chat ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: ConversationRepository, useClass: DrizzleConversationRepository },
    { provide: MessageRepository, useClass: DrizzleMessageRepository },
    { provide: ParticipantStateRepository, useClass: DrizzleParticipantStateRepository },
    { provide: ChatInboxReadModel, useClass: DrizzleChatInboxReadModel },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    // The WebSocket gateway registers itself as the delegate on init (Chat.2b);
    // no-op until then, so the Chat.1 shape and tests need no gateway.
    SettableChatPusher,
    { provide: ChatPusher, useExisting: SettableChatPusher },
    // Resolves the other participant's handle/avatar for the inbox, over the
    // QueryBus (global) — no import of the profile module.
    { provide: ProfileSnapshotReader, useClass: QueryBusProfileSnapshotReader },
]

@Module({
    // AuthModule for the shared JwtCookieGuard; CoachingModule exports CoachLinks
    // (authorizes who may write in a conversation); PresenceReadModule → PresenceReader
    // (the inbox's live presence). DatabaseModule (DRIZZLE), CqrsModule and
    // ObservabilityModule are global.
    imports: [AuthModule, CoachingModule, PresenceReadModule],
    providers: [
        ...ADAPTERS,
        ...CHAT_COMMAND_HANDLERS,
        ...CHAT_QUERY_HANDLERS,
        ...CHAT_EVENT_HANDLERS,
        ...CHAT_RESOLVERS,
    ],
    // The gateway (Chat.2b) injects SettableChatPusher to register itself.
    exports: [SettableChatPusher],
})
export class ChatModule {}

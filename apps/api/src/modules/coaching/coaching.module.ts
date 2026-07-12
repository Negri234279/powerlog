import { Module, type Provider } from '@nestjs/common'

import { AdminGuard } from '../../auth/admin.guard'
import { RolesGuard } from '../../auth/roles.guard'
import { CoachLinks } from '../../shared/contracts/coach-links'
import { AuthModule } from '../auth/auth.module'
import {
    COACHING_COMMAND_HANDLERS,
    COACHING_EVENT_HANDLERS,
    COACHING_QUERY_HANDLERS,
} from './application/coaching.application'
import { AdminCoachingStatsReadModel } from './application/ports/admin-coaching-stats.read-model'
import { DrizzleAdminCoachingStatsReadModel } from './infrastructure/persistence/read-models/drizzle-admin-coaching-stats.read-model'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { InviteTokenGenerator } from './application/ports/invite-token-generator.port'
import { CoachInvitationRepository } from './domain/repositories/coach-invitation.repository'
import { CoachLinkRepository } from './domain/repositories/coach-link.repository'
import { CoachNoteRepository } from './domain/repositories/coach-note.repository'
import { CoachingCoachLinks } from './infrastructure/coach-links/coaching-coach-links'
import { Sha256InviteTokenGenerator } from './infrastructure/crypto/sha256-invite-token-generator'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { DrizzleCoachInvitationRepository } from './infrastructure/persistence/repositories/drizzle-coach-invitation.repository'
import { DrizzleCoachLinkRepository } from './infrastructure/persistence/repositories/drizzle-coach-link.repository'
import { DrizzleCoachNoteRepository } from './infrastructure/persistence/repositories/drizzle-coach-note.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { COACHING_RESOLVERS } from './presentation/coaching.presentation'

/** Binds coaching ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: CoachInvitationRepository, useClass: DrizzleCoachInvitationRepository },
    { provide: CoachLinkRepository, useClass: DrizzleCoachLinkRepository },
    { provide: CoachNoteRepository, useClass: DrizzleCoachNoteRepository },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: InviteTokenGenerator, useClass: Sha256InviteTokenGenerator },
    // Cross-module port consumed by workouts (Bloque 5.9) to authorize planning.
    { provide: CoachLinks, useClass: CoachingCoachLinks },
    { provide: AdminCoachingStatsReadModel, useClass: DrizzleAdminCoachingStatsReadModel },
]

@Module({
    // AuthModule for the shared JwtCookieGuard + the exported UserDirectory.
    // DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule],
    providers: [
        ...ADAPTERS,
        RolesGuard,
        AdminGuard,
        ...COACHING_COMMAND_HANDLERS,
        ...COACHING_QUERY_HANDLERS,
        ...COACHING_EVENT_HANDLERS,
        ...COACHING_RESOLVERS,
    ],
    exports: [CoachLinks],
})
export class CoachingModule {}

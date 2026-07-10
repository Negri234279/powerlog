import { Module, type Provider } from '@nestjs/common'

import { CommandBusSessionPlanApplier } from '../../planning/command-bus-session-plan-applier'
import { QueryBusMesocycleDesignContextReader } from '../../planning/query-bus-mesocycle-design-context-reader'
import { QueryBusSessionPlanContextReader } from '../../planning/query-bus-session-plan-context-reader'
import { MesocycleDesignContextReader } from '../../shared/contracts/mesocycle-design-context'
import { SessionPlanApplier } from '../../shared/contracts/session-plan-applier'
import { SessionPlanContextReader } from '../../shared/contracts/session-plan-context'
import { AuthModule } from '../auth/auth.module'
import {
    AI_APPLICATION_SERVICES,
    AI_COMMAND_HANDLERS,
    AI_EVENT_HANDLERS,
    AI_QUERY_HANDLERS,
} from './application/ai.application'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { SecretCipher } from './application/ports/secret-cipher.port'
import { AiMesocycleDraftRepository } from './domain/repositories/ai-mesocycle-draft.repository'
import { AiPlanDraftRepository } from './domain/repositories/ai-plan-draft.repository'
import { AiProviderConfigRepository } from './domain/repositories/ai-provider-config.repository'
import { AesGcmSecretCipher } from './infrastructure/crypto/aes-gcm-secret-cipher'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { DrizzleAiMesocycleDraftRepository } from './infrastructure/persistence/repositories/drizzle-ai-mesocycle-draft.repository'
import { DrizzleAiPlanDraftRepository } from './infrastructure/persistence/repositories/drizzle-ai-plan-draft.repository'
import { DrizzleAiProviderConfigRepository } from './infrastructure/persistence/repositories/drizzle-ai-provider-config.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { AI_RESOLVERS } from './presentation/ai.presentation'

/** Binds the AI module's ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: SecretCipher, useClass: AesGcmSecretCipher },
    { provide: AiProviderConfigRepository, useClass: DrizzleAiProviderConfigRepository },
    { provide: AiPlanDraftRepository, useClass: DrizzleAiPlanDraftRepository },
    { provide: AiMesocycleDraftRepository, useClass: DrizzleAiMesocycleDraftRepository },
    // Cross-module contracts, bridged over the CQRS buses and handled by workouts.
    { provide: SessionPlanContextReader, useClass: QueryBusSessionPlanContextReader },
    { provide: SessionPlanApplier, useClass: CommandBusSessionPlanApplier },
    { provide: MesocycleDesignContextReader, useClass: QueryBusMesocycleDesignContextReader },
]

/**
 * Two things: the user's BYOK provider configuration (keys encrypted at rest),
 * and the AI-programmed session plans built with them.
 *
 * Distinct from the `AiModule` in `src/ai`, which is the shared provider layer
 * this module calls to verify a key, list its models and run a completion.
 */
@Module({
    // AuthModule is imported for the shared JwtCookieGuard (it carries its own
    // TokenSigner dependency). DatabaseModule (DRIZZLE), CqrsModule and AiModule
    // (LlmProviderRegistry) are global.
    imports: [AuthModule],
    providers: [
        ...ADAPTERS,
        ...AI_APPLICATION_SERVICES,
        ...AI_COMMAND_HANDLERS,
        ...AI_QUERY_HANDLERS,
        ...AI_EVENT_HANDLERS,
        ...AI_RESOLVERS,
    ],
})
export class AiSettingsModule {}

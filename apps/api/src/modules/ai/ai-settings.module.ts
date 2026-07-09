import { Module, type Provider } from '@nestjs/common'

import { CommandBusSessionPlanApplier } from '../../planning/command-bus-session-plan-applier'
import { QueryBusSessionPlanContextReader } from '../../planning/query-bus-session-plan-context-reader'
import { SessionPlanApplier } from '../../shared/contracts/session-plan-applier'
import { SessionPlanContextReader } from '../../shared/contracts/session-plan-context'
import { AuthModule } from '../auth/auth.module'
import { AI_COMMAND_HANDLERS, AI_EVENT_HANDLERS, AI_QUERY_HANDLERS } from './application/ai.application'
import { Clock } from './application/ports/clock.port'
import { SecretCipher } from './application/ports/secret-cipher.port'
import { AiProviderConfigRepository } from './domain/repositories/ai-provider-config.repository'
import { AesGcmSecretCipher } from './infrastructure/crypto/aes-gcm-secret-cipher'
import { DrizzleAiProviderConfigRepository } from './infrastructure/persistence/repositories/drizzle-ai-provider-config.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { AI_RESOLVERS } from './presentation/ai.presentation'

/** Binds the AI settings ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: Clock, useClass: SystemClock },
    { provide: SecretCipher, useClass: AesGcmSecretCipher },
    { provide: AiProviderConfigRepository, useClass: DrizzleAiProviderConfigRepository },
    // Cross-module contracts, bridged over the CQRS buses and handled by workouts.
    { provide: SessionPlanContextReader, useClass: QueryBusSessionPlanContextReader },
    { provide: SessionPlanApplier, useClass: CommandBusSessionPlanApplier },
]

/**
 * BYOK provider configuration: which key a user has stored for which provider,
 * and which model they picked. The keys themselves are encrypted at rest.
 *
 * Distinct from the `AiModule` in `src/ai`, which is the shared provider layer
 * this module calls to verify a key and list its models.
 */
@Module({
    // AuthModule is imported for the shared JwtCookieGuard (it carries its own
    // TokenSigner dependency). DatabaseModule (DRIZZLE), CqrsModule and AiModule
    // (LlmProviderRegistry) are global.
    imports: [AuthModule],
    providers: [...ADAPTERS, ...AI_COMMAND_HANDLERS, ...AI_QUERY_HANDLERS, ...AI_EVENT_HANDLERS, ...AI_RESOLVERS],
})
export class AiSettingsModule {}

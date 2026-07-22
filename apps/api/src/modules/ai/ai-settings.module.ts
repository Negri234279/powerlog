import { Module, type Provider } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { CommandBusSessionPlanApplier } from '../../planning/command-bus-session-plan-applier'
import { QueryBusMesocycleDesignContextReader } from '../../planning/query-bus-mesocycle-design-context-reader'
import { QueryBusSessionPlanContextReader } from '../../planning/query-bus-session-plan-context-reader'
import { MesocycleDesignContextReader } from '../../shared/contracts/mesocycle-design-context'
import { SessionPlanApplier } from '../../shared/contracts/session-plan-applier'
import { SessionPlanContextReader } from '../../shared/contracts/session-plan-context'
import { BullQueueFactory } from '../../queue/bull-queue.factory'
import { AuthModule } from '../auth/auth.module'
import {
    AI_APPLICATION_SERVICES,
    AI_COMMAND_HANDLERS,
    AI_EVENT_HANDLERS,
    AI_QUERY_HANDLERS,
} from './application/ai.application'
import { AiDraftHistoryReadModel } from './application/ports/ai-draft-history.read-model'
import { AiGenerationMetrics } from './application/ports/ai-generation-metrics.port'
import { AiGenerationQueue } from './application/ports/ai-generation-queue.port'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { ModelPricing } from './application/ports/model-pricing.port'
import { SecretCipher } from './application/ports/secret-cipher.port'
import { AiGenerationRepository } from './domain/repositories/ai-generation.repository'
import { AiMesocycleDraftRepository } from './domain/repositories/ai-mesocycle-draft.repository'
import { AiPlanDraftRepository } from './domain/repositories/ai-plan-draft.repository'
import { AiProviderConfigRepository } from './domain/repositories/ai-provider-config.repository'
import { AiUsageRepository } from './domain/repositories/ai-usage.repository'
import { AesGcmSecretCipher } from './infrastructure/crypto/aes-gcm-secret-cipher'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { PrometheusAiGenerationMetrics } from './infrastructure/metrics/prometheus-ai-generation-metrics'
import { DrizzleAiDraftHistoryReadModel } from './infrastructure/persistence/read-models/drizzle-ai-draft-history.read-model'
import { DrizzleAiGenerationRepository } from './infrastructure/persistence/repositories/drizzle-ai-generation.repository'
import { DrizzleAiMesocycleDraftRepository } from './infrastructure/persistence/repositories/drizzle-ai-mesocycle-draft.repository'
import { DrizzleAiPlanDraftRepository } from './infrastructure/persistence/repositories/drizzle-ai-plan-draft.repository'
import { DrizzleAiProviderConfigRepository } from './infrastructure/persistence/repositories/drizzle-ai-provider-config.repository'
import { DrizzleAiUsageRepository } from './infrastructure/persistence/repositories/drizzle-ai-usage.repository'
import { StaticModelPricing } from './infrastructure/pricing/static-model-pricing'
import { BullAiGenerationQueue } from './infrastructure/queue/bull-ai-generation.queue'
import { InProcessAiGenerationQueue } from './infrastructure/queue/in-process-ai-generation.queue'
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
    { provide: AiGenerationRepository, useClass: DrizzleAiGenerationRepository },
    { provide: AiUsageRepository, useClass: DrizzleAiUsageRepository },
    { provide: AiDraftHistoryReadModel, useClass: DrizzleAiDraftHistoryReadModel },
    { provide: ModelPricing, useClass: StaticModelPricing },
    { provide: AiGenerationMetrics, useClass: PrometheusAiGenerationMetrics },
    // Cross-module contracts, bridged over the CQRS buses and handled by workouts.
    { provide: SessionPlanContextReader, useClass: QueryBusSessionPlanContextReader },
    { provide: SessionPlanApplier, useClass: CommandBusSessionPlanApplier },
    { provide: MesocycleDesignContextReader, useClass: QueryBusMesocycleDesignContextReader },
]

/** BullMQ when Redis is configured, in-process otherwise — see AiGenerationQueue.
 *  The shared BullQueueFactory owns the connections and their shutdown;
 *  `available` mirrors whether Redis is set. */
const GENERATION_QUEUE: Provider = {
    provide: AiGenerationQueue,
    inject: [BullQueueFactory, CommandBus, PinoLogger],
    useFactory: (queues: BullQueueFactory, commandBus: CommandBus, logger: PinoLogger): AiGenerationQueue =>
        queues.available
            ? new BullAiGenerationQueue(queues, commandBus, logger)
            : new InProcessAiGenerationQueue(commandBus, logger),
}

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
        GENERATION_QUEUE,
        ...AI_APPLICATION_SERVICES,
        ...AI_COMMAND_HANDLERS,
        ...AI_QUERY_HANDLERS,
        ...AI_EVENT_HANDLERS,
        ...AI_RESOLVERS,
    ],
})
export class AiSettingsModule {}

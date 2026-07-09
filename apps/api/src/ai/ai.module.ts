import { Global, Module } from '@nestjs/common'
import { getToken } from '@willsoto/nestjs-prometheus'
import { PinoLogger } from 'nestjs-pino'
import type { Counter, Histogram } from 'prom-client'

import { METRIC } from '../observability/metrics'
import { AnthropicProviderClient } from './anthropic.provider-client'
import { LlmProviderRegistry } from './llm-provider.registry'
import { MeteredLlmProviderClient } from './metered.llm-provider-client'
import { OpenAiProviderClient } from './openai.provider-client'

/**
 * Provides the `LlmProviderRegistry`: one metered client per supported provider.
 * Global so any feature module can call an LLM without importing this module.
 * Lives outside `src/modules` (shared kernel), mirroring `MailModule`.
 *
 * The adapters hold no API key — keys travel per call — so a single instance of
 * each serves every user.
 */
@Global()
@Module({
    providers: [
        {
            provide: LlmProviderRegistry,
            inject: [
                getToken(METRIC.llmRequests),
                getToken(METRIC.llmRequestDuration),
                getToken(METRIC.llmTokens),
                PinoLogger,
            ],
            useFactory: (
                requests: Counter<string>,
                requestDuration: Histogram<string>,
                tokens: Counter<string>,
                logger: PinoLogger,
            ): LlmProviderRegistry => {
                const clients = [new OpenAiProviderClient(), new AnthropicProviderClient()].map(
                    (client) => new MeteredLlmProviderClient(client, requests, requestDuration, tokens, logger),
                )

                return new LlmProviderRegistry(clients)
            },
        },
    ],
    exports: [LlmProviderRegistry],
})
export class AiModule {}

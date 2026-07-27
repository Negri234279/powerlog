import { randomUUID } from 'node:crypto'

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { CqrsModule } from '@nestjs/cqrs'
import { ThrottlerModule } from '@nestjs/throttler'
import type { Request } from 'express'
import { ClsModule } from 'nestjs-cls'
import { LoggerModule } from 'nestjs-pino'

import { AiModule } from './ai/ai.module'
import { AppResolver } from './app.resolver'
import { isProd, isStaging, isTest, validateEnv } from './config/env'
import { DatabaseModule } from './database/database.module'
import { EntitlementsModule } from './entitlements/entitlements.module'
import { GraphqlModule } from './graphql/graphql.module'
import { HealthModule } from './health/health.module'
import { MailModule } from './mail/mail.module'
import { AiSettingsModule } from './modules/ai/ai-settings.module'
import { AuthModule } from './modules/auth/auth.module'
import { BillingModule } from './modules/billing/billing.module'
import { ChatModule } from './modules/chat/chat.module'
import { CoachingModule } from './modules/coaching/coaching.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { ProfileModule } from './modules/profile/profile.module'
import { SupportModule } from './modules/support/support.module'
import { WorkoutsModule } from './modules/workouts/workouts.module'
import { logContextMixin } from './observability/log-context.mixin'
import { ObservabilityModule } from './observability/observability.module'
import { QueueModule } from './queue/queue.module'
import { RealtimeModule } from './realtime/realtime.module'
import { RedisModule } from './redis/redis.module'
import { GqlThrottlerGuard } from './throttler/gql-throttler.guard'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            // Loads apps/api/.env (cwd when running the API); real envs are
            // injected by compose. JWT key files default to this same folder.
            envFilePath: ['.env'],
            validate: validateEnv,
        }),
        // AsyncLocalStorage context: a correlationId per request (from the
        // x-correlation-id header or generated) that flows through resolvers,
        // CQRS handlers and logs. userId is added by the auth guard.
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
                generateId: true,
                idGenerator: (req: Request): string => {
                    const header = req.headers['x-correlation-id']
                    return (typeof header === 'string' && header) || randomUUID()
                },
            },
        }),
        LoggerModule.forRoot({
            pinoHttp: {
                // prod/staging: JSON at info; dev/test: pretty at debug.
                level: isProd || isStaging ? 'info' : 'debug',
                // App logs (CQRS, handlers) carry only reqId, not the full
                // serialized request object (pino-http binds `req` to req.log
                // by default; quietReqLogger trims that to just the id).
                quietReqLogger: true,
                // Skip CORS preflight + health/metrics scrape noise.
                autoLogging: {
                    ignore: (req) => req.method === 'OPTIONS' || req.url === '/health' || req.url === '/metrics',
                },
                // Stamp every log with correlationId/userId from CLS.
                mixin: logContextMixin,
                // dev/test: trim req/res to the essentials (keeps the host
                // terminal and the dev Loki logs tidy). prod/staging: default
                // serializers → Loki keeps the full request/response.
                ...(isProd || isStaging
                    ? {}
                    : {
                          serializers: {
                              req: (req) => ({
                                  method: req.method,
                                  url: req.url,
                                  operationName: req?.body?.operationName,
                              }),
                              res: (res) => ({ statusCode: res.statusCode }),
                          },
                      }),
                // Pretty only on an interactive host terminal (`pnpm dev`). A
                // non-TTY stdout (Docker container, prod, staging) emits JSON so
                // Alloy/Loki can parse it into structured fields.
                transport:
                    isProd || isStaging || !process.stdout.isTTY
                        ? undefined
                        : {
                              target: 'pino-pretty',
                              options: {
                                  singleLine: true,
                                  // Hide pure noise; keep correlationId/trace_id
                                  // visible for debugging errors.
                                  ignore: 'pid,hostname,span_id,trace_flags,reqId',
                              },
                          },
                redact: ['req.headers.cookie', 'req.headers.authorization'],
            },
        }),
        // CQRS v11 requires explicit forRoot().
        CqrsModule.forRoot(),
        // Rate limiting (in-memory). Loose global default; tight per-route via
        // @Throttle on sensitive auth mutations. Skipped in automated tests.
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60_000, limit: 120 }],
            skipIf: () => isTest,
        }),
        DatabaseModule,
        RedisModule,
        QueueModule,
        EntitlementsModule,
        GraphqlModule,
        ObservabilityModule,
        HealthModule,
        MailModule,
        AiModule,
        RealtimeModule,
        // Feature modules (added per milestone):
        AuthModule,
        ProfileModule,
        WorkoutsModule,
        NotificationsModule,
        CoachingModule,
        AiSettingsModule,
        // Answers GetUserEntitlementsQuery, which the Entitlements adapter above
        // dispatches — so it must be registered for any gated action to resolve.
        BillingModule,
        // Public contact form → support tickets (+ admin surface, Block 2.2).
        SupportModule,
        // Coach↔athlete chat (Chat.1: domain/app/persistence over GraphQL).
        ChatModule,
    ],
    providers: [AppResolver, { provide: APP_GUARD, useClass: GqlThrottlerGuard }],
})
export class AppModule {}

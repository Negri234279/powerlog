import { Module, type Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'

import type { Env } from '../config/env'
import { AuthModule } from '../modules/auth/auth.module'
import { PresenceReadModule } from '../presence/presence-read.module'
import { PushOnAiGenerationSettled } from './event-handlers/push-on-ai-generation-settled.handler'
import { PushOnChatMessage } from './event-handlers/push-on-chat-message.handler'
import { PushOnCoachInvitation } from './event-handlers/push-on-coach-invitation.handler'
import { PushOnMesocycleAssigned } from './event-handlers/push-on-mesocycle-assigned.handler'
import { PushOnSessionPlanned } from './event-handlers/push-on-session-planned.handler'
import { DrizzlePushSubscriptionStore } from './infrastructure/drizzle-push-subscription.store'
import { PushResolver } from './presentation/push.resolver'
import { PushNotifier } from './push-notifier'
import { PushService } from './push.service'
import { PushSubscriptionStore } from './push-subscription-store'
import { NoopPushTransport } from './sender/noop-push-transport'
import { PushTransport } from './sender/push-transport'
import { WebPushTransport } from './sender/web-push-transport'

/** Turn the integration events that already fan out to the bell + SSE into a
 *  third channel: a browser push, for when the app is closed. */
const EVENT_HANDLERS = [
    PushOnSessionPlanned,
    PushOnMesocycleAssigned,
    PushOnCoachInvitation,
    PushOnAiGenerationSettled,
    PushOnChatMessage,
]

/** web-push when the VAPID key pair is set, a no-op otherwise — the same
 *  "optional, degrades in-process" switch as Redis and the payment gateways. */
const TRANSPORT: Provider = {
    provide: PushTransport,
    inject: [ConfigService, PinoLogger],
    useFactory: (config: ConfigService<Env, true>, logger: PinoLogger): PushTransport => {
        const publicKey = config.get('VAPID_PUBLIC_KEY')
        const privateKey = config.get('VAPID_PRIVATE_KEY')

        return publicKey && privateKey
            ? new WebPushTransport({ subject: config.get('VAPID_SUBJECT'), publicKey, privateKey }, logger)
            : new NoopPushTransport()
    },
}

/**
 * Transversal Web Push module (lives outside `src/modules`, like `src/realtime`
 * and `src/presence`): a third fan-out channel next to the notification bell and
 * the realtime SSE stream. It exposes `PushNotifier` for the integration-event
 * handlers (Push.4) and a small GraphQL surface for the browser to register its
 * subscription and read the VAPID public key.
 */
@Module({
    // AuthModule for the shared JwtCookieGuard + UserDirectory (resolving the
    // counterpart's handle for the copy). PresenceReadModule for the shared
    // OnlineRegistry (the chat handler's presence guard). CqrsModule,
    // DatabaseModule and ObservabilityModule (the metric providers) are global.
    imports: [AuthModule, PresenceReadModule],
    providers: [
        TRANSPORT,
        { provide: PushSubscriptionStore, useClass: DrizzlePushSubscriptionStore },
        { provide: PushNotifier, useClass: PushService },
        PushResolver,
        ...EVENT_HANDLERS,
    ],
    exports: [PushNotifier],
})
export class PushModule {}

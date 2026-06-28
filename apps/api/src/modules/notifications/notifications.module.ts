import { Module, type Provider } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import {
    NOTIFICATIONS_APPLICATION_SERVICES,
    NOTIFICATIONS_COMMAND_HANDLERS,
    NOTIFICATIONS_EVENT_HANDLERS,
    NOTIFICATIONS_QUERY_HANDLERS,
} from './application/notifications.application'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { NotificationRepository } from './domain/repositories/notification.repository'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { DrizzleNotificationRepository } from './infrastructure/persistence/repositories/drizzle-notification.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { NOTIFICATIONS_RESOLVERS } from './presentation/notifications.presentation'

/** Binds notifications ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: NotificationRepository, useClass: DrizzleNotificationRepository },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
]

@Module({
    // AuthModule for the shared JwtCookieGuard + the exported UserDirectory.
    // DatabaseModule (DRIZZLE), CqrsModule, MailModule and ObservabilityModule are global.
    imports: [AuthModule],
    providers: [
        ...ADAPTERS,
        ...NOTIFICATIONS_APPLICATION_SERVICES,
        ...NOTIFICATIONS_COMMAND_HANDLERS,
        ...NOTIFICATIONS_QUERY_HANDLERS,
        ...NOTIFICATIONS_EVENT_HANDLERS,
        ...NOTIFICATIONS_RESOLVERS,
    ],
})
export class NotificationsModule {}

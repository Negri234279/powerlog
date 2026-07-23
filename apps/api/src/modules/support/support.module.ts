import { Module, type Provider } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import {
    SUPPORT_COMMAND_HANDLERS,
    SUPPORT_EVENT_HANDLERS,
    SUPPORT_QUERY_HANDLERS,
} from './application/support.application'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { SupportMetrics } from './application/ports/support-metrics.port'
import { SupportTicketRepository } from './domain/repositories/support-ticket.repository'
import { PrometheusSupportMetrics } from './infrastructure/metrics/prometheus-support-metrics'
import { DrizzleSupportTicketRepository } from './infrastructure/persistence/repositories/drizzle-support-ticket.repository'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { SystemClock } from './infrastructure/time/system-clock'
import { SUPPORT_RESOLVERS } from './presentation/support.presentation'

/** Binds support ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: SupportTicketRepository, useClass: DrizzleSupportTicketRepository },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: SupportMetrics, useClass: PrometheusSupportMetrics },
]

@Module({
    // AuthModule for the exported UserDirectory (link a ticket to an account) plus
    // the admin guard used by the Block 2.2 resolver. DRIZZLE, Cqrs and Mail are global.
    imports: [AuthModule],
    providers: [
        ...ADAPTERS,
        ...SUPPORT_COMMAND_HANDLERS,
        ...SUPPORT_QUERY_HANDLERS,
        ...SUPPORT_EVENT_HANDLERS,
        ...SUPPORT_RESOLVERS,
    ],
})
export class SupportModule {}

import { SupportMetrics } from '../../../src/modules/support/application/ports/support-metrics.port'
import type { TicketCategory } from '../../../src/modules/support/domain/ticket-category'

/** Recording SupportMetrics double — asserts what was counted, by category. */
export class FakeSupportMetrics extends SupportMetrics {
    readonly opened: TicketCategory[] = []

    recordTicketOpened(category: TicketCategory): void {
        this.opened.push(category)
    }
}

import type { InvoiceEntity } from '../entities/invoice.entity'
import type { PaymentGateway } from '../entities/subscription.entity'

export abstract class InvoiceRepository {
    /** Insert, or update the row that already mirrors this gateway invoice. */
    abstract upsert(invoice: InvoiceEntity): Promise<void>

    abstract findById(id: string): Promise<InvoiceEntity | null>

    abstract findByGatewayId(gateway: PaymentGateway, gatewayInvoiceId: string): Promise<InvoiceEntity | null>

    /** The user's billing history, newest first. */
    abstract listByUser(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<{ rows: InvoiceEntity[]; total: number }>
}

import type { InvoiceEntity } from '../../../src/modules/billing/domain/entities/invoice.entity'
import type { PaymentGateway } from '../../../src/modules/billing/domain/entities/subscription.entity'
import { InvoiceRepository } from '../../../src/modules/billing/domain/repositories/invoice.repository'

/** In-memory InvoiceRepository. Keyed like the real one: by the GATEWAY's invoice id. */
export class InMemoryInvoiceRepository extends InvoiceRepository {
    private readonly byGatewayId = new Map<string, InvoiceEntity>()

    async upsert(invoice: InvoiceEntity): Promise<void> {
        this.byGatewayId.set(`${invoice.gateway}:${invoice.gatewayInvoiceId}`, invoice)
    }

    async findById(id: string): Promise<InvoiceEntity | null> {
        return [...this.byGatewayId.values()].find((invoice) => invoice.id === id) ?? null
    }

    async findByGatewayId(gateway: PaymentGateway, gatewayInvoiceId: string): Promise<InvoiceEntity | null> {
        return this.byGatewayId.get(`${gateway}:${gatewayInvoiceId}`) ?? null
    }

    async listByUser(userId: string, limit: number, offset: number): Promise<{ rows: InvoiceEntity[]; total: number }> {
        const all = [...this.byGatewayId.values()]
            .filter((invoice) => invoice.userId === userId)
            .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())

        return { rows: all.slice(offset, offset + limit), total: all.length }
    }

    all(): InvoiceEntity[] {
        return [...this.byGatewayId.values()]
    }
}

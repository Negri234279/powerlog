import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { InvoiceEntity, type InvoiceStatus } from '../../../domain/entities/invoice.entity'
import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { Currency } from '../../../domain/plan-interval'
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository'
import { invoices } from '../schema/invoices.schema'

type InvoiceRow = typeof invoices.$inferSelect

function toEntity(row: InvoiceRow): InvoiceEntity {
    return InvoiceEntity.rehydrate({
        id: row.id,
        userId: row.userId,
        subscriptionId: row.subscriptionId,
        gateway: row.gateway as PaymentGateway,
        gatewayInvoiceId: row.gatewayInvoiceId,
        number: row.number,
        status: row.status as InvoiceStatus,
        amountDueCents: row.amountDueCents,
        amountPaidCents: row.amountPaidCents,
        currency: row.currency as Currency,
        hostedUrl: row.hostedUrl,
        pdfUrl: row.pdfUrl,
        issuedAt: row.issuedAt,
        paidAt: row.paidAt,
    })
}

@Injectable()
export class DrizzleInvoiceRepository extends InvoiceRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async upsert(invoice: InvoiceEntity): Promise<void> {
        const now = new Date()

        await this.db
            .insert(invoices)
            .values({
                id: invoice.id,
                userId: invoice.userId,
                subscriptionId: invoice.subscriptionId,
                gateway: invoice.gateway,
                gatewayInvoiceId: invoice.gatewayInvoiceId,
                number: invoice.number,
                status: invoice.status,
                amountDueCents: invoice.amountDueCents,
                amountPaidCents: invoice.amountPaidCents,
                currency: invoice.currency,
                hostedUrl: invoice.hostedUrl,
                pdfUrl: invoice.pdfUrl,
                issuedAt: invoice.issuedAt,
                paidAt: invoice.paidAt,
                updatedAt: now,
            })
            // Keyed on the gateway's invoice id, not on ours: the same invoice going
            // open → paid must update one row, not create a second.
            .onConflictDoUpdate({
                target: [invoices.gateway, invoices.gatewayInvoiceId],
                set: {
                    subscriptionId: invoice.subscriptionId,
                    number: invoice.number,
                    status: invoice.status,
                    amountDueCents: invoice.amountDueCents,
                    amountPaidCents: invoice.amountPaidCents,
                    hostedUrl: invoice.hostedUrl,
                    pdfUrl: invoice.pdfUrl,
                    paidAt: invoice.paidAt,
                    updatedAt: now,
                },
            })
    }

    async findByGatewayId(gateway: PaymentGateway, gatewayInvoiceId: string): Promise<InvoiceEntity | null> {
        const [row] = await this.db
            .select()
            .from(invoices)
            .where(and(eq(invoices.gateway, gateway), eq(invoices.gatewayInvoiceId, gatewayInvoiceId)))
            .limit(1)

        return row ? toEntity(row) : null
    }

    async listByUser(userId: string, limit: number, offset: number): Promise<{ rows: InvoiceEntity[]; total: number }> {
        const rows = await this.db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId))
            .orderBy(desc(invoices.issuedAt))
            .limit(limit)
            .offset(offset)

        const [total] = await this.db.select({ value: count() }).from(invoices).where(eq(invoices.userId, userId))

        return { rows: rows.map(toEntity), total: Number(total?.value ?? 0) }
    }
}

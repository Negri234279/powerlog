import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import type { Request, Response } from 'express'

import type { AuthUser } from '../../../../auth/auth-user'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { GetInvoiceReceiptQuery } from '../../application/queries/get-invoice-receipt/get-invoice-receipt.query'
import type { InvoiceReceipt } from '../../application/queries/get-invoice-receipt/get-invoice-receipt.handler'

/**
 * `GET /invoices/:id/receipt.pdf` — the generated receipt for gateways that issue
 * no PDF of their own (PayPal). REST (bytes) is the sanctioned exception to
 * "everything in GraphQL", the same reasoning as the avatar routes.
 *
 * Authorization is the query's job: it renders only the caller's own invoice and
 * returns null otherwise, which becomes a flat 404 here so a guessed id cannot tell
 * "not yours" from "not there".
 */
@Controller('invoices')
@UseGuards(JwtCookieGuard)
export class InvoiceReceiptController {
    constructor(private readonly queryBus: QueryBus) {}

    @Get(':id/receipt.pdf')
    async receipt(@Param('id') id: string, @Req() req: Request, @Res() res: Response): Promise<void> {
        const user = req.user as AuthUser
        const query = new GetInvoiceReceiptQuery(user.userId, id)
        const receipt = await this.queryBus.execute<GetInvoiceReceiptQuery, InvoiceReceipt | null>(query)

        if (!receipt) {
            res.status(404).end()

            return
        }

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename="${receipt.filename}"`)
        // It is the user's own private document — never store it in a shared cache.
        res.setHeader('Cache-Control', 'private, no-store')
        res.end(receipt.bytes)
    }
}

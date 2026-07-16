import { describe, expect, it } from 'vitest'

import type { ReceiptData } from '../../application/ports/receipt-renderer.port'
import { PdfKitReceiptRenderer } from './pdfkit-receipt-renderer'

const DATA: ReceiptData = {
    number: 'PL-2026-ABCD1234',
    issuedAt: new Date('2026-07-15T00:00:00.000Z'),
    paidAt: new Date('2026-07-15T00:00:00.000Z'),
    billedTo: { name: 'Alex Rivera', email: 'buyer@example.com' },
    description: 'Athlete Pro plan',
    amountCents: 799,
    currency: 'EUR',
    paidVia: 'PayPal',
}

describe('the pdfkit receipt renderer', () => {
    it('produces a non-empty PDF document', async () => {
        const bytes = await new PdfKitReceiptRenderer().render(DATA)

        // The magic number every PDF starts with — enough to know pdfkit ran and we
        // streamed real bytes, without pinning the exact layout.
        expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
        expect(bytes.length).toBeGreaterThan(500)
    })

    it('renders even when the buyer has no name', async () => {
        const bytes = await new PdfKitReceiptRenderer().render({ ...DATA, billedTo: { name: null, email: 'x@y.z' } })

        expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    })
})

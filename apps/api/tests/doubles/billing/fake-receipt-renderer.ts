import { type ReceiptData, ReceiptRenderer } from '../../../src/modules/billing/application/ports/receipt-renderer.port'

/** Recording ReceiptRenderer double: captures the data it was asked to render and
 *  returns a deterministic, recognisable buffer, so tests assert on the inputs
 *  without pulling in pdfkit. */
export class FakeReceiptRenderer extends ReceiptRenderer {
    readonly rendered: ReceiptData[] = []

    async render(data: ReceiptData): Promise<Buffer> {
        this.rendered.push(data)

        return Buffer.from(`receipt:${data.number}`)
    }
}

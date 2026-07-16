import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

import { type ReceiptData, ReceiptRenderer } from '../../application/ports/receipt-renderer.port'

const BRAND = 'Powerlog'
const INK = '#111111'
const MUTED = '#6b7280'
const RULE = '#e5e7eb'

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

/**
 * Draws the receipt with pdfkit — a programmatic PDF, no headless browser. It is a
 * plain, self-contained one-page document using the built-in Helvetica, so it
 * needs no bundled fonts and renders identically anywhere.
 */
@Injectable()
export class PdfKitReceiptRenderer extends ReceiptRenderer {
    async render(data: ReceiptData): Promise<Buffer> {
        const doc = new PDFDocument({ size: 'A4', margin: 56 })

        const done = new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            
            doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', reject)
        })

        this.draw(doc, data)
        doc.end()

        return done
    }

    private draw(doc: PDFKit.PDFDocument, data: ReceiptData): void {
        const left = doc.page.margins.left
        const right = doc.page.width - doc.page.margins.right

        // Header: brand on the left, "Receipt" + number on the right.
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(BRAND, left, 56)
        doc.font('Helvetica').fontSize(10).fillColor(MUTED)
        doc.text('Receipt', left, 56, { width: right - left, align: 'right' })
        doc.fillColor(INK).text(`No. ${data.number}`, left, 70, { width: right - left, align: 'right' })

        // Meta: dates.
        doc.moveTo(left, 100).lineTo(right, 100).strokeColor(RULE).stroke()
        doc.fillColor(MUTED).fontSize(9).text('ISSUED', left, 114)
        doc.fillColor(INK).fontSize(11).text(formatDate(data.issuedAt), left, 126)

        if (data.paidAt) {
            doc.fillColor(MUTED)
                .fontSize(9)
                .text('PAID', left + 160, 114)
            doc.fillColor(INK)
                .fontSize(11)
                .text(formatDate(data.paidAt), left + 160, 126)
        }

        // Billed to.
        doc.fillColor(MUTED).fontSize(9).text('BILLED TO', left, 158)

        let y = 170
        if (data.billedTo.name) {
            doc.fillColor(INK).fontSize(11).text(data.billedTo.name, left, y)
            y += 14
        }

        doc.fillColor(INK).fontSize(11).text(data.billedTo.email, left, y)

        // The single line item, in a bordered block.
        const tableTop = 224
        doc.moveTo(left, tableTop).lineTo(right, tableTop).strokeColor(RULE).stroke()
        doc.fillColor(MUTED)
            .fontSize(9)
            .text('DESCRIPTION', left, tableTop + 12)
        doc.text('AMOUNT', left, tableTop + 12, { width: right - left, align: 'right' })
        doc.moveTo(left, tableTop + 28)
            .lineTo(right, tableTop + 28)
            .strokeColor(RULE)
            .stroke()

        const amount = formatAmount(data.amountCents, data.currency)
        doc.fillColor(INK)
            .fontSize(11)
            .text(data.description, left, tableTop + 40, { width: (right - left) * 0.7 })
        doc.text(amount, left, tableTop + 40, { width: right - left, align: 'right' })

        // Total.
        const totalTop = tableTop + 76
        doc.moveTo(left, totalTop).lineTo(right, totalTop).strokeColor(RULE).stroke()
        doc.font('Helvetica-Bold').fontSize(12).fillColor(INK)
        doc.text('Total paid', left, totalTop + 12)
        doc.text(amount, left, totalTop + 12, { width: right - left, align: 'right' })

        // Footer.
        doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        doc.text(`Paid via ${data.paidVia}.`, left, totalTop + 44)
        doc.text(`${BRAND} — thank you.`, left, doc.page.height - 72, { width: right - left, align: 'center' })
    }
}

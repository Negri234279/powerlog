import type { TicketCategory } from '../../../domain/ticket-category'

/** Open a support ticket from a public contact-form submission. */
export class SubmitContactMessageCommand {
    constructor(
        readonly name: string | null,
        readonly email: string,
        readonly category: TicketCategory,
        readonly subject: string,
        readonly message: string,
    ) {}
}

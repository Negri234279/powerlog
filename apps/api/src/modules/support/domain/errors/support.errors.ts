import { DomainError } from '../../../../shared/domain/domain-error'

/** Domain errors for the support context. Each carries a stable `code`. */
export abstract class SupportError extends DomainError {}

export class TicketNotFoundError extends SupportError {
    readonly code = 'TICKET_NOT_FOUND'
    constructor() {
        super('Support ticket not found.')
    }
}

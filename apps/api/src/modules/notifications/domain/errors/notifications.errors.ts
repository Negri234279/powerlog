import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the notifications context. Each carries a stable `code` the
 * global exception filter maps to GraphQL/HTTP + metrics.
 */
export abstract class NotificationsError extends DomainError {}

export class InvalidNotificationCursorError extends NotificationsError {
    readonly code = 'INVALID_NOTIFICATION_CURSOR'
    constructor() {
        super('The pagination cursor is malformed.')
    }
}

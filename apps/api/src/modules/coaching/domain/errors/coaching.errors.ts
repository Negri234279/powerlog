import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the coaching context. Each carries a stable `code` the
 * global exception filter maps to GraphQL/HTTP + metrics.
 */
export abstract class CoachingError extends DomainError {}

export class AthleteNotFoundError extends CoachingError {
    readonly code = 'ATHLETE_NOT_FOUND'
    constructor() {
        super('No user found with that username.')
    }
}

export class CannotInviteSelfError extends CoachingError {
    readonly code = 'CANNOT_INVITE_SELF'
    constructor() {
        super('You cannot invite yourself.')
    }
}

export class AlreadyLinkedError extends CoachingError {
    readonly code = 'ALREADY_LINKED'
    constructor() {
        super('You already coach this athlete.')
    }
}

export class InvitationAlreadyPendingError extends CoachingError {
    readonly code = 'INVITATION_ALREADY_PENDING'
    constructor() {
        super('There is already a pending invitation for this athlete.')
    }
}

export class InvitationNotFoundError extends CoachingError {
    readonly code = 'INVITATION_NOT_FOUND'
    constructor() {
        super('Invitation not found.')
    }
}

export class InvalidInvitationStateError extends CoachingError {
    readonly code = 'INVALID_INVITATION_STATE'
    constructor() {
        super('This invitation is no longer pending.')
    }
}

export class NotYourAthleteError extends CoachingError {
    readonly code = 'NOT_YOUR_ATHLETE'
    constructor() {
        super('This athlete is not linked to you.')
    }
}

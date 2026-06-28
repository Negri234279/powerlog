import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the profile context. Each carries a stable `code` the
 * global exception filter maps to GraphQL/HTTP + metrics.
 */
export abstract class ProfileError extends DomainError {}

export class InvalidDisplayNameError extends ProfileError {
    readonly code = 'INVALID_DISPLAY_NAME'
    constructor() {
        super('Display name must be 3–30 characters: lowercase letters, numbers and underscores.')
    }
}

export class InvalidPersonNameError extends ProfileError {
    readonly code = 'INVALID_PERSON_NAME'
    constructor() {
        super('Name must be between 1 and 60 characters.')
    }
}

export class InvalidBirthDateError extends ProfileError {
    readonly code = 'INVALID_BIRTH_DATE'
    constructor(message = 'Birth date is invalid.') {
        super(message)
    }
}

export class InvalidSexError extends ProfileError {
    readonly code = 'INVALID_SEX'
    constructor(value: string) {
        super(`Invalid sex "${value}". Expected "male" or "female".`)
    }
}

export class InvalidHeightError extends ProfileError {
    readonly code = 'INVALID_HEIGHT'
    constructor() {
        super('Height must be a whole number between 50 and 300 cm.')
    }
}

export class InvalidBioError extends ProfileError {
    readonly code = 'INVALID_BIO'
    constructor() {
        super('Bio must be at most 1000 characters.')
    }
}

export class ProfileNotFoundError extends ProfileError {
    readonly code = 'PROFILE_NOT_FOUND'
    constructor() {
        super('Profile not found.')
    }
}

/** The chosen handle (display name) is already taken by another profile. */
export class DisplayNameAlreadyInUseError extends ProfileError {
    readonly code = 'DISPLAY_NAME_ALREADY_IN_USE'
    constructor() {
        super('That handle is already taken.')
    }
}

import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the auth context. Each carries a stable `code` so the
 * global exception filter can map them to GraphQL/HTTP responses + metrics
 * without leaking internals. Thrown from the domain/application layers.
 */
export abstract class AuthError extends DomainError {}

export class InvalidEmailError extends AuthError {
    readonly code = 'INVALID_EMAIL'
    constructor(value: string) {
        super(`Invalid email address: "${value}".`)
    }
}

export class InvalidUnitsError extends AuthError {
    readonly code = 'INVALID_UNITS'
    constructor(value: string) {
        super(`Invalid units "${value}". Expected "kg" or "lb".`)
    }
}

export class InvalidUserRoleError extends AuthError {
    readonly code = 'INVALID_USER_ROLE'
    constructor(value: string) {
        super(`Invalid user role "${value}". Expected "athlete" or "coach".`)
    }
}

export class InvalidPasswordHashError extends AuthError {
    readonly code = 'INVALID_PASSWORD_HASH'
    constructor() {
        super('Value is not a valid password hash.')
    }
}

export class EmailAlreadyInUseError extends AuthError {
    readonly code = 'EMAIL_ALREADY_IN_USE'
    constructor() {
        super('That email address is already registered.')
    }
}

/** Generic auth failure for login: never reveal whether the email exists. */
export class InvalidCredentialsError extends AuthError {
    readonly code = 'INVALID_CREDENTIALS'
    constructor() {
        super('Invalid email or password.')
    }
}

export class UserNotFoundError extends AuthError {
    readonly code = 'USER_NOT_FOUND'
    constructor() {
        super('User not found.')
    }
}

/** An admin tried to revoke their own admin rights (lockout safeguard). */
export class CannotRevokeOwnAdminError extends AuthError {
    readonly code = 'CANNOT_REVOKE_OWN_ADMIN'
    constructor() {
        super('You cannot revoke your own admin access.')
    }
}

/** An admin tried to disable their own account (lockout safeguard). */
export class CannotDisableOwnAccountError extends AuthError {
    readonly code = 'CANNOT_DISABLE_SELF'
    constructor() {
        super('You cannot disable your own account.')
    }
}

/** Operation not allowed on a soft-deleted (GDPR) account. */
export class AccountDeletedError extends AuthError {
    readonly code = 'ACCOUNT_DELETED'
    constructor() {
        super('This account has been deleted.')
    }
}

/** Refresh token missing, expired, revoked, or reused. */
export class InvalidRefreshTokenError extends AuthError {
    readonly code = 'INVALID_REFRESH_TOKEN'
    constructor() {
        super('The refresh token is invalid or has expired.')
    }
}

/** Email-verification token missing, expired, or already used. */
export class InvalidEmailVerificationTokenError extends AuthError {
    readonly code = 'INVALID_EMAIL_VERIFICATION_TOKEN'
    constructor() {
        super('The verification link is invalid or has expired.')
    }
}

/** Tried to resend verification for an already-verified email. */
export class EmailAlreadyVerifiedError extends AuthError {
    readonly code = 'EMAIL_ALREADY_VERIFIED'
    constructor() {
        super('This email is already verified.')
    }
}

/** The supplied current password did not match (change-password). */
export class InvalidCurrentPasswordError extends AuthError {
    readonly code = 'INVALID_CURRENT_PASSWORD'
    constructor() {
        super('The current password is incorrect.')
    }
}

/** Password-reset token missing, expired, or already used. */
export class InvalidPasswordResetTokenError extends AuthError {
    readonly code = 'INVALID_PASSWORD_RESET_TOKEN'
    constructor() {
        super('The password reset link is invalid or has expired.')
    }
}

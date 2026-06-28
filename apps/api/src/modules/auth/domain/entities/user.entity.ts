import { AggregateRoot } from '@nestjs/cqrs'

import { AccountDeletedError } from '../errors/auth.errors'
import type { DomainEvent } from '../events/domain-event'
import { UserRegisteredEvent } from '../events/user-registered.event'
import { EmailVO } from '../value-objects/email.vo'
import type { PasswordHashVO } from '../value-objects/password-hash.vo'
import type { UnitsVO } from '../value-objects/units.vo'
import { UserRoleVO } from '../value-objects/user-role.vo'

export type AuthProvider = 'google'

/**
 * Account lifecycle. `active` is the only state that can authenticate;
 * `disabled` is a (reversible) suspension; `deleted` is a GDPR soft-delete with
 * PII scrubbed but the row retained (id + timestamps) for referential integrity
 * and legal records. Terminal: a `deleted` account is never re-activated.
 */
export const ACCOUNT_STATUSES = ['active', 'disabled', 'deleted'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** A linked external identity (part of the User aggregate). */
export interface AuthIdentity {
    readonly provider: AuthProvider
    readonly providerId: string
}

export interface UserProps {
    id: string
    email: EmailVO
    passwordHash: PasswordHashVO | null
    units: UnitsVO
    role: UserRoleVO
    isAdmin: boolean
    status: AccountStatus
    emailVerifiedAt: Date | null
    identities: AuthIdentity[]
    createdAt: Date
    updatedAt: Date
}

/**
 * `UserAggregate` — auth aggregate root.
 *
 * Owns its linked OAuth identities so account-linking stays consistent within
 * the aggregate boundary. `passwordHash` is null for Google-only accounts.
 * Domain methods take an explicit `now` to stay free of ambient clocks.
 */
export class UserAggregate extends AggregateRoot<DomainEvent> {
    private constructor(private readonly props: UserProps) {
        super()
    }

    /** Create a brand-new user (with or without a password). Emits an event. */
    static register(input: {
        id: string
        email: EmailVO
        passwordHash: PasswordHashVO | null
        units: UnitsVO
        role?: UserRoleVO
        isAdmin?: boolean
        emailVerifiedAt?: Date | null
        now: Date
    }): UserAggregate {
        const user = new UserAggregate({
            id: input.id,
            email: input.email,
            passwordHash: input.passwordHash,
            units: input.units,
            role: input.role ?? UserRoleVO.default(),
            isAdmin: input.isAdmin ?? false,
            status: 'active',
            emailVerifiedAt: input.emailVerifiedAt ?? null,
            identities: [],
            createdAt: input.now,
            updatedAt: input.now,
        })
        user.apply(new UserRegisteredEvent(input.id, input.email.value, input.now))
        return user
    }

    /** Reconstruct from persistence (no events emitted). */
    static rehydrate(props: UserProps): UserAggregate {
        return new UserAggregate(props)
    }

    /** Attach an OAuth identity (idempotent on provider + providerId). */
    linkIdentity(identity: AuthIdentity, now: Date): void {
        const exists = this.props.identities.some(
            (i) => i.provider === identity.provider && i.providerId === identity.providerId,
        )
        if (exists) return
        this.props.identities.push(identity)
        this.props.updatedAt = now
    }

    hasIdentity(provider: AuthProvider, providerId: string): boolean {
        return this.props.identities.some((i) => i.provider === provider && i.providerId === providerId)
    }

    hasPassword(): boolean {
        return this.props.passwordHash !== null
    }

    /** Promote to coach (self-service). Idempotent. */
    becomeCoach(now: Date): void {
        if (this.props.role.value === 'coach') return
        this.props.role = UserRoleVO.coach()
        this.props.updatedAt = now
    }

    /** Admin action: set the account role (athlete ↔ coach). Idempotent. */
    setRole(role: UserRoleVO, now: Date): void {
        if (this.props.role.equals(role)) return
        this.props.role = role
        this.props.updatedAt = now
    }

    /** Admin action: grant or revoke platform admin. Idempotent. */
    setAdmin(isAdmin: boolean, now: Date): void {
        if (this.props.isAdmin === isAdmin) return
        this.props.isAdmin = isAdmin
        this.props.updatedAt = now
    }

    /** Set or replace the password hash (change-password / reset / set-password). */
    setPassword(passwordHash: PasswordHashVO, now: Date): void {
        this.props.passwordHash = passwordHash
        this.props.updatedAt = now
    }

    /** Confirm email ownership. Idempotent: keeps the first verification time. */
    verifyEmail(now: Date): void {
        if (this.props.emailVerifiedAt !== null) return
        this.props.emailVerifiedAt = now
        this.props.updatedAt = now
    }

    isEmailVerified(): boolean {
        return this.props.emailVerifiedAt !== null
    }

    /** Only an active account may log in / refresh. */
    canAuthenticate(): boolean {
        return this.props.status === 'active'
    }

    /** Suspend the account (reversible). Idempotent; can't touch a deleted one. */
    disable(now: Date): void {
        if (this.props.status === 'deleted') throw new AccountDeletedError()
        if (this.props.status === 'disabled') return
        this.props.status = 'disabled'
        this.props.updatedAt = now
    }

    /** Lift a suspension. Idempotent; a deleted account can't be re-activated. */
    enable(now: Date): void {
        if (this.props.status === 'deleted') throw new AccountDeletedError()
        if (this.props.status === 'active') return
        this.props.status = 'active'
        this.props.updatedAt = now
    }

    /**
     * GDPR soft-delete: mark the account `deleted` and scrub personal data,
     * keeping only the id + timestamps. The email is replaced with a unique,
     * derived placeholder so its constraint holds and the original is freed for
     * re-registration (the handle lives in the profile, freed when it's removed).
     * Password and linked identities are dropped. Idempotent.
     */
    softDelete(now: Date): void {
        if (this.props.status === 'deleted') return
        this.props.status = 'deleted'
        this.props.email = EmailVO.create(`${this.props.id}@deleted.invalid`)
        this.props.passwordHash = null
        this.props.emailVerifiedAt = null
        this.props.identities = []
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get email(): EmailVO {
        return this.props.email
    }
    get passwordHash(): PasswordHashVO | null {
        return this.props.passwordHash
    }
    get units(): UnitsVO {
        return this.props.units
    }
    get role(): UserRoleVO {
        return this.props.role
    }
    get isAdmin(): boolean {
        return this.props.isAdmin
    }
    get status(): AccountStatus {
        return this.props.status
    }
    get emailVerifiedAt(): Date | null {
        return this.props.emailVerifiedAt
    }
    get identities(): readonly AuthIdentity[] {
        return this.props.identities
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}

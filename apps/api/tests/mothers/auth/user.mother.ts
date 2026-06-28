import {
    type AccountStatus,
    type AuthIdentity,
    UserAggregate,
} from '../../../src/modules/auth/domain/entities/user.entity'
import { EmailVO } from '../../../src/modules/auth/domain/value-objects/email.vo'
import { PasswordHashVO } from '../../../src/modules/auth/domain/value-objects/password-hash.vo'
import { UnitsVO } from '../../../src/modules/auth/domain/value-objects/units.vo'
import { type UserRoleValue, UserRoleVO } from '../../../src/modules/auth/domain/value-objects/user-role.vo'

const DEFAULT_HASH = '$argon2id$v=19$m=65536,t=3,p=4$abcdefgh$ijklmnopqrst'
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for the User aggregate. Fluent builder with sane defaults:
 *   UserMother.create().withEmail("x@y.z").build()      // new (emits event)
 *   UserMother.coach().buildExisting()                  // rehydrated (no event)
 */
export class UserMother {
    private id = '11111111-1111-4111-8111-111111111111'
    private email = 'lifter@example.com'
    private passwordHash: string | null = DEFAULT_HASH
    private units: 'kg' | 'lb' = 'kg'
    private role: UserRoleValue = 'athlete'
    private isAdmin = false
    private status: AccountStatus = 'active'
    private emailVerifiedAt: Date | null = null
    private now = DEFAULT_NOW
    private readonly identities: AuthIdentity[] = []

    static create(): UserMother {
        return new UserMother()
    }

    static athlete(): UserMother {
        return new UserMother().withRole('athlete')
    }

    static coach(): UserMother {
        return new UserMother().withRole('coach')
    }

    static admin(): UserMother {
        return new UserMother().asAdmin()
    }

    withId(id: string): this {
        this.id = id
        return this
    }

    withEmail(email: string): this {
        this.email = email
        return this
    }

    withPassword(hash: string = DEFAULT_HASH): this {
        this.passwordHash = hash
        return this
    }

    withoutPassword(): this {
        this.passwordHash = null
        return this
    }

    withUnits(units: 'kg' | 'lb'): this {
        this.units = units
        return this
    }

    withRole(role: UserRoleValue): this {
        this.role = role
        return this
    }

    asAdmin(isAdmin = true): this {
        this.isAdmin = isAdmin
        return this
    }

    withStatus(status: AccountStatus): this {
        this.status = status
        return this
    }

    disabled(): this {
        this.status = 'disabled'
        return this
    }

    deleted(): this {
        this.status = 'deleted'
        return this
    }

    emailVerified(at: Date = DEFAULT_NOW): this {
        this.emailVerifiedAt = at
        return this
    }

    registeredAt(now: Date): this {
        this.now = now
        return this
    }

    withGoogleIdentity(providerId: string): this {
        this.identities.push({ provider: 'google', providerId })
        return this
    }

    /** A brand-new user via `register()` — carries the UserRegistered event. */
    build(): UserAggregate {
        const user = UserAggregate.register({
            id: this.id,
            email: EmailVO.create(this.email),
            passwordHash: this.passwordHash ? PasswordHashVO.fromHash(this.passwordHash) : null,
            units: UnitsVO.create(this.units),
            role: UserRoleVO.create(this.role),
            isAdmin: this.isAdmin,
            emailVerifiedAt: this.emailVerifiedAt,
            now: this.now,
        })
        for (const identity of this.identities) {
            user.linkIdentity(identity, this.now)
        }
        return user
    }

    /** A reconstructed user via `rehydrate()` — no events, includes identities. */
    buildExisting(): UserAggregate {
        return UserAggregate.rehydrate({
            id: this.id,
            email: EmailVO.create(this.email),
            passwordHash: this.passwordHash ? PasswordHashVO.fromHash(this.passwordHash) : null,
            units: UnitsVO.create(this.units),
            role: UserRoleVO.create(this.role),
            isAdmin: this.isAdmin,
            status: this.status,
            emailVerifiedAt: this.emailVerifiedAt,
            identities: [...this.identities],
            createdAt: this.now,
            updatedAt: this.now,
        })
    }
}

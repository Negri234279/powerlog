import {
    PasswordResetTokenEntity,
    type PasswordResetTokenProps,
} from '../../../src/modules/auth/domain/entities/password-reset-token.entity'

const FAR_FUTURE = new Date('2999-01-01T00:00:00.000Z')
const PAST = new Date('2000-01-01T00:00:00.000Z')
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for PasswordResetTokenEntity. Defaults to an active token.
 *   PasswordResetTokenMother.valid() / .expired() / .consumed()
 */
export class PasswordResetTokenMother {
    private readonly props: PasswordResetTokenProps = {
        id: '66666666-6666-4666-8666-666666666666',
        userId: '11111111-1111-4111-8111-111111111111',
        tokenHash: 'hash:reset-1',
        expiresAt: FAR_FUTURE,
        consumedAt: null,
        createdAt: DEFAULT_NOW,
    }

    static valid(): PasswordResetTokenMother {
        return new PasswordResetTokenMother()
    }

    static expired(): PasswordResetTokenMother {
        return new PasswordResetTokenMother().expired()
    }

    static consumed(): PasswordResetTokenMother {
        return new PasswordResetTokenMother().consumed()
    }

    withId(id: string): this {
        this.props.id = id
        return this
    }

    forUser(userId: string): this {
        this.props.userId = userId
        return this
    }

    withTokenHash(tokenHash: string): this {
        this.props.tokenHash = tokenHash
        return this
    }

    expired(): this {
        this.props.expiresAt = PAST
        return this
    }

    consumed(at: Date = DEFAULT_NOW): this {
        this.props.consumedAt = at
        return this
    }

    build(): PasswordResetTokenEntity {
        return PasswordResetTokenEntity.rehydrate({ ...this.props })
    }
}

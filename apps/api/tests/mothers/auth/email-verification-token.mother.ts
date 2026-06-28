import {
    EmailVerificationTokenEntity,
    type EmailVerificationTokenProps,
} from '../../../src/modules/auth/domain/entities/email-verification-token.entity'

const FAR_FUTURE = new Date('2999-01-01T00:00:00.000Z')
const PAST = new Date('2000-01-01T00:00:00.000Z')
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for EmailVerificationTokenEntity. Defaults to an active token.
 *   EmailVerificationTokenMother.valid() / .expired() / .consumed()
 */
export class EmailVerificationTokenMother {
    private readonly props: EmailVerificationTokenProps = {
        id: '55555555-5555-4555-8555-555555555555',
        userId: '11111111-1111-4111-8111-111111111111',
        tokenHash: 'hash:token-1',
        expiresAt: FAR_FUTURE,
        consumedAt: null,
        createdAt: DEFAULT_NOW,
    }

    static valid(): EmailVerificationTokenMother {
        return new EmailVerificationTokenMother()
    }

    static expired(): EmailVerificationTokenMother {
        return new EmailVerificationTokenMother().expired()
    }

    static consumed(): EmailVerificationTokenMother {
        return new EmailVerificationTokenMother().consumed()
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

    expiringAt(expiresAt: Date): this {
        this.props.expiresAt = expiresAt
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

    build(): EmailVerificationTokenEntity {
        return EmailVerificationTokenEntity.rehydrate({ ...this.props })
    }
}

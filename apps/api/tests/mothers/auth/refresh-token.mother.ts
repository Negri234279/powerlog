import {
    RefreshTokenEntity,
    type RefreshTokenProps,
} from '../../../src/modules/auth/domain/entities/refresh-token.entity'

const FAR_FUTURE = new Date('2999-01-01T00:00:00.000Z')
const PAST = new Date('2000-01-01T00:00:00.000Z')
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for RefreshTokenEntity. Defaults to an active token; presets
 * cover the states reuse-detection and rotation care about:
 *   RefreshTokenMother.valid()         // active
 *   RefreshTokenMother.expired()       // past expiry
 *   RefreshTokenMother.revoked()       // revoked, no replacement
 *   RefreshTokenMother.alreadyRotated()// revoked + points at its replacement
 *   RefreshTokenMother.fromFamily(f)   // grouped under a given family
 */
export class RefreshTokenMother {
    private readonly props: RefreshTokenProps = {
        id: '22222222-2222-4222-8222-222222222222',
        userId: '11111111-1111-4111-8111-111111111111',
        family: '33333333-3333-4333-8333-333333333333',
        tokenHash: 'hash:raw-1',
        expiresAt: FAR_FUTURE,
        revokedAt: null,
        replacedBy: null,
        userAgent: null,
        ip: null,
        createdAt: DEFAULT_NOW,
    }

    static create(): RefreshTokenMother {
        return new RefreshTokenMother()
    }

    static valid(): RefreshTokenMother {
        return new RefreshTokenMother()
    }

    static expired(): RefreshTokenMother {
        return new RefreshTokenMother().expired()
    }

    static revoked(): RefreshTokenMother {
        return new RefreshTokenMother().revoked()
    }

    static alreadyRotated(replacedById = '44444444-4444-4444-8444-444444444444'): RefreshTokenMother {
        return new RefreshTokenMother().rotatedTo(replacedById)
    }

    static fromFamily(family: string): RefreshTokenMother {
        return new RefreshTokenMother().inFamily(family)
    }

    withId(id: string): this {
        this.props.id = id
        return this
    }

    forUser(userId: string): this {
        this.props.userId = userId
        return this
    }

    inFamily(family: string): this {
        this.props.family = family
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

    revoked(at: Date = DEFAULT_NOW): this {
        this.props.revokedAt = at
        return this
    }

    /** Revoked and linked to the token that replaced it (a rotated token). */
    rotatedTo(replacedById: string, at: Date = DEFAULT_NOW): this {
        this.props.revokedAt = this.props.revokedAt ?? at
        this.props.replacedBy = replacedById
        return this
    }

    issuedAt(createdAt: Date): this {
        this.props.createdAt = createdAt
        return this
    }

    onDevice(userAgent: string | null, ip: string | null = null): this {
        this.props.userAgent = userAgent
        this.props.ip = ip
        return this
    }

    build(): RefreshTokenEntity {
        return RefreshTokenEntity.rehydrate({ ...this.props })
    }
}

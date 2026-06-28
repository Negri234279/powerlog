export interface RefreshTokenProps {
    id: string
    userId: string
    /** Groups a token with all of its rotations; stable across the chain. */
    family: string
    /** SHA-256 of the opaque token; the raw value is never stored. */
    tokenHash: string
    expiresAt: Date
    revokedAt: Date | null
    /** Id of the token that rotated this one, if any. */
    replacedBy: string | null
    /** Device metadata captured at issue/rotation (for the sessions list). */
    userAgent: string | null
    ip: string | null
    createdAt: Date
}

/**
 * `RefreshTokenEntity` — a persisted session credential. Encapsulates the
 * active/expired/revoked logic used during refresh and reuse detection.
 */
export class RefreshTokenEntity {
    private constructor(private readonly props: RefreshTokenProps) {}

    static rehydrate(props: RefreshTokenProps): RefreshTokenEntity {
        return new RefreshTokenEntity(props)
    }

    isExpired(now: Date): boolean {
        return this.props.expiresAt.getTime() <= now.getTime()
    }

    isRevoked(): boolean {
        return this.props.revokedAt !== null
    }

    isActive(now: Date): boolean {
        return !this.isRevoked() && !this.isExpired(now)
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get family(): string {
        return this.props.family
    }
    get tokenHash(): string {
        return this.props.tokenHash
    }
    get expiresAt(): Date {
        return this.props.expiresAt
    }
    get revokedAt(): Date | null {
        return this.props.revokedAt
    }
    get replacedBy(): string | null {
        return this.props.replacedBy
    }
    get userAgent(): string | null {
        return this.props.userAgent
    }
    get ip(): string | null {
        return this.props.ip
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
}

export interface PasswordResetTokenProps {
    id: string
    userId: string
    /** SHA-256 of the opaque token; the raw value is never stored. */
    tokenHash: string
    expiresAt: Date
    consumedAt: Date | null
    createdAt: Date
}

/**
 * `PasswordResetTokenEntity` — a single-use credential authorizing a password
 * reset. Encapsulates the expired/consumed/active logic checked on reset.
 */
export class PasswordResetTokenEntity {
    private constructor(private readonly props: PasswordResetTokenProps) {}

    static rehydrate(props: PasswordResetTokenProps): PasswordResetTokenEntity {
        return new PasswordResetTokenEntity(props)
    }

    isExpired(now: Date): boolean {
        return this.props.expiresAt.getTime() <= now.getTime()
    }

    isConsumed(): boolean {
        return this.props.consumedAt !== null
    }

    isActive(now: Date): boolean {
        return !this.isConsumed() && !this.isExpired(now)
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get tokenHash(): string {
        return this.props.tokenHash
    }
    get expiresAt(): Date {
        return this.props.expiresAt
    }
    get consumedAt(): Date | null {
        return this.props.consumedAt
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
}

export interface EmailVerificationTokenProps {
    id: string
    userId: string
    /** SHA-256 of the opaque token; the raw value is never stored. */
    tokenHash: string
    expiresAt: Date
    consumedAt: Date | null
    createdAt: Date
}

/**
 * `EmailVerificationTokenEntity` — a single-use credential proving email
 * ownership. Encapsulates the expired/consumed/active logic checked on verify.
 */
export class EmailVerificationTokenEntity {
    private constructor(private readonly props: EmailVerificationTokenProps) {}

    static rehydrate(props: EmailVerificationTokenProps): EmailVerificationTokenEntity {
        return new EmailVerificationTokenEntity(props)
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

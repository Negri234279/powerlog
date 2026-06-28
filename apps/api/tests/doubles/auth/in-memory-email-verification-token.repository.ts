import { randomUUID } from 'node:crypto'

import {
    EmailVerificationTokenEntity,
    type EmailVerificationTokenProps,
} from '../../../src/modules/auth/domain/entities/email-verification-token.entity'
import {
    type CreateEmailVerificationTokenInput,
    EmailVerificationTokenRepository,
} from '../../../src/modules/auth/domain/repositories/email-verification-token.repository'

/** In-memory EmailVerificationTokenRepository implementing the real interface. */
export class InMemoryEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
    private readonly tokens = new Map<string, EmailVerificationTokenProps>()

    constructor(
        seed: EmailVerificationTokenEntity[] = [],
        private readonly createdAt: Date = new Date('2026-01-01T00:00:00.000Z'),
    ) {
        super()
        for (const token of seed) this.seed(token)
    }

    async create(input: CreateEmailVerificationTokenInput): Promise<EmailVerificationTokenEntity> {
        const props: EmailVerificationTokenProps = {
            id: randomUUID(),
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            consumedAt: null,
            createdAt: this.createdAt,
        }
        this.tokens.set(props.id, props)
        return EmailVerificationTokenEntity.rehydrate({ ...props })
    }

    async findByHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null> {
        for (const props of this.tokens.values()) {
            if (props.tokenHash === tokenHash) {
                return EmailVerificationTokenEntity.rehydrate({ ...props })
            }
        }
        return null
    }

    async consume(id: string, now: Date): Promise<void> {
        const props = this.tokens.get(id)
        if (props) props.consumedAt = props.consumedAt ?? now
    }

    seed(token: EmailVerificationTokenEntity): void {
        this.tokens.set(token.id, {
            id: token.id,
            userId: token.userId,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            consumedAt: token.consumedAt,
            createdAt: token.createdAt,
        })
    }

    all(): EmailVerificationTokenEntity[] {
        return [...this.tokens.values()].map((p) => EmailVerificationTokenEntity.rehydrate({ ...p }))
    }
}

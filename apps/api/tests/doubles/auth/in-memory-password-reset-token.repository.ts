import { randomUUID } from 'node:crypto'

import {
    PasswordResetTokenEntity,
    type PasswordResetTokenProps,
} from '../../../src/modules/auth/domain/entities/password-reset-token.entity'
import {
    type CreatePasswordResetTokenInput,
    PasswordResetTokenRepository,
} from '../../../src/modules/auth/domain/repositories/password-reset-token.repository'

/** In-memory PasswordResetTokenRepository implementing the real interface. */
export class InMemoryPasswordResetTokenRepository extends PasswordResetTokenRepository {
    private readonly tokens = new Map<string, PasswordResetTokenProps>()

    constructor(
        seed: PasswordResetTokenEntity[] = [],
        private readonly createdAt: Date = new Date('2026-01-01T00:00:00.000Z'),
    ) {
        super()
        for (const token of seed) this.seed(token)
    }

    async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetTokenEntity> {
        const props: PasswordResetTokenProps = {
            id: randomUUID(),
            userId: input.userId,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            consumedAt: null,
            createdAt: this.createdAt,
        }
        this.tokens.set(props.id, props)
        return PasswordResetTokenEntity.rehydrate({ ...props })
    }

    async findByHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
        for (const props of this.tokens.values()) {
            if (props.tokenHash === tokenHash) {
                return PasswordResetTokenEntity.rehydrate({ ...props })
            }
        }
        return null
    }

    async consume(id: string, now: Date): Promise<void> {
        const props = this.tokens.get(id)
        if (props) props.consumedAt = props.consumedAt ?? now
    }

    seed(token: PasswordResetTokenEntity): void {
        this.tokens.set(token.id, {
            id: token.id,
            userId: token.userId,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            consumedAt: token.consumedAt,
            createdAt: token.createdAt,
        })
    }

    all(): PasswordResetTokenEntity[] {
        return [...this.tokens.values()].map((p) => PasswordResetTokenEntity.rehydrate({ ...p }))
    }
}

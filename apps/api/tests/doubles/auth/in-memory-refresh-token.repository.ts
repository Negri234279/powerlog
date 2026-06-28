import { randomUUID } from 'node:crypto'

import {
    RefreshTokenEntity,
    type RefreshTokenProps,
} from '../../../src/modules/auth/domain/entities/refresh-token.entity'
import {
    type CreateRefreshTokenInput,
    RefreshTokenRepository,
} from '../../../src/modules/auth/domain/repositories/refresh-token.repository'

/**
 * In-memory RefreshTokenRepository implementing the real abstract interface.
 * Stores raw props so rotation/revocation mutate state the way the DB row would;
 * reads always hand back a fresh (immutable) entity.
 */
export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
    private readonly tokens = new Map<string, RefreshTokenProps>()

    constructor(
        seed: RefreshTokenEntity[] = [],
        private readonly createdAt: Date = new Date('2026-01-01T00:00:00.000Z'),
    ) {
        super()
        for (const token of seed) this.seed(token)
    }

    async create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
        const props: RefreshTokenProps = {
            id: randomUUID(),
            userId: input.userId,
            family: input.family,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            revokedAt: null,
            replacedBy: null,
            userAgent: input.userAgent ?? null,
            ip: input.ip ?? null,
            createdAt: this.createdAt,
        }
        this.tokens.set(props.id, props)
        return RefreshTokenEntity.rehydrate({ ...props })
    }

    async findActiveByUser(userId: string): Promise<RefreshTokenEntity[]> {
        return [...this.tokens.values()]
            .filter((p) => p.userId === userId && p.revokedAt === null)
            .map((p) => RefreshTokenEntity.rehydrate({ ...p }))
    }

    async findByHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
        for (const props of this.tokens.values()) {
            if (props.tokenHash === tokenHash) {
                return RefreshTokenEntity.rehydrate({ ...props })
            }
        }
        return null
    }

    async revoke(id: string, replacedById: string | null): Promise<void> {
        const props = this.tokens.get(id)
        if (!props) return
        props.revokedAt = props.revokedAt ?? this.createdAt
        props.replacedBy = replacedById
    }

    async revokeFamily(family: string): Promise<void> {
        for (const props of this.tokens.values()) {
            if (props.family === family && props.revokedAt === null) {
                props.revokedAt = this.createdAt
            }
        }
    }

    async revokeAllForUser(userId: string): Promise<void> {
        for (const props of this.tokens.values()) {
            if (props.userId === userId && props.revokedAt === null) {
                props.revokedAt = this.createdAt
            }
        }
    }

    /** Seed a pre-existing token (built by a mother) into the store. */
    seed(token: RefreshTokenEntity): void {
        this.tokens.set(token.id, {
            id: token.id,
            userId: token.userId,
            family: token.family,
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            revokedAt: token.revokedAt,
            replacedBy: token.replacedBy,
            userAgent: token.userAgent,
            ip: token.ip,
            createdAt: token.createdAt,
        })
    }

    /** Test inspection: every stored token as an entity. */
    all(): RefreshTokenEntity[] {
        return [...this.tokens.values()].map((p) => RefreshTokenEntity.rehydrate({ ...p }))
    }
}

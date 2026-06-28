import type { AuthProvider, UserAggregate } from '../../../src/modules/auth/domain/entities/user.entity'
import { UserRepository } from '../../../src/modules/auth/domain/repositories/user.repository'
import type { EmailVO } from '../../../src/modules/auth/domain/value-objects/email.vo'

/**
 * In-memory UserRepository implementing the real abstract interface. Stores
 * aggregates by id; `save` upserts. Use the `seed`/`all` helpers to set up and
 * assert state without reaching into private fields.
 */
export class InMemoryUserRepository extends UserRepository {
    private readonly users = new Map<string, UserAggregate>()

    constructor(seed: UserAggregate[] = []) {
        super()
        for (const user of seed) this.users.set(user.id, user)
    }

    async findById(id: string): Promise<UserAggregate | null> {
        return this.users.get(id) ?? null
    }

    async findByEmail(email: EmailVO): Promise<UserAggregate | null> {
        for (const user of this.users.values()) {
            if (user.email.value === email.value) return user
        }
        return null
    }

    async findByIdentity(provider: AuthProvider, providerId: string): Promise<UserAggregate | null> {
        for (const user of this.users.values()) {
            if (user.hasIdentity(provider, providerId)) return user
        }
        return null
    }

    async save(user: UserAggregate): Promise<void> {
        this.users.set(user.id, user)
    }

    async delete(id: string): Promise<void> {
        this.users.delete(id)
    }

    /** Test inspection: every stored aggregate. */
    all(): UserAggregate[] {
        return [...this.users.values()]
    }
}

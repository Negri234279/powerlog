import type { ProfileAggregate } from '../../../src/modules/profile/domain/entities/profile.entity'
import { ProfileRepository } from '../../../src/modules/profile/domain/repositories/profile.repository'

/** In-memory ProfileRepository implementing the real abstract interface. */
export class InMemoryProfileRepository extends ProfileRepository {
    private readonly byUser = new Map<string, ProfileAggregate>()

    constructor(seed: ProfileAggregate[] = []) {
        super()
        for (const profile of seed) this.byUser.set(profile.userId, profile)
    }

    async findByUserId(userId: string): Promise<ProfileAggregate | null> {
        return this.byUser.get(userId) ?? null
    }

    async findByDisplayName(displayName: string): Promise<ProfileAggregate | null> {
        for (const profile of this.byUser.values()) {
            if (profile.displayName.value === displayName) return profile
        }
        return null
    }

    async save(profile: ProfileAggregate): Promise<void> {
        this.byUser.set(profile.userId, profile)
    }

    async deleteByUserId(userId: string): Promise<void> {
        this.byUser.delete(userId)
    }

    /** Test inspection: every stored profile. */
    all(): ProfileAggregate[] {
        return [...this.byUser.values()]
    }
}

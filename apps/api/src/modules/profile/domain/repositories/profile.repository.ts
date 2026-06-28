import type { ProfileAggregate } from '../entities/profile.entity'

/**
 * Persistence port for the Profile aggregate (keyed by userId, 1:1 with the
 * auth user). `save` upserts. The Drizzle implementation lives in infrastructure.
 */
export abstract class ProfileRepository {
    abstract findByUserId(userId: string): Promise<ProfileAggregate | null>
    /** Resolve a profile by its (unique, canonical) handle, or null if free. */
    abstract findByDisplayName(displayName: string): Promise<ProfileAggregate | null>
    abstract save(profile: ProfileAggregate): Promise<void>
    /** Hard-delete a profile by userId (used to erase data on account deletion). */
    abstract deleteByUserId(userId: string): Promise<void>
}

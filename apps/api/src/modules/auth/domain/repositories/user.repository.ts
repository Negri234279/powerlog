import type { AuthProvider, UserAggregate } from '../entities/user.entity'
import type { EmailVO } from '../value-objects/email.vo'

/**
 * Persistence port for the User aggregate. The Drizzle implementation lives in
 * infrastructure. `save` upserts the user and its linked identities.
 */
export abstract class UserRepository {
    abstract findById(id: string): Promise<UserAggregate | null>
    abstract findByEmail(email: EmailVO): Promise<UserAggregate | null>
    abstract findByIdentity(provider: AuthProvider, providerId: string): Promise<UserAggregate | null>
    abstract save(user: UserAggregate): Promise<void>
    /** Hard-delete a user by id (used to compensate a failed registration). */
    abstract delete(id: string): Promise<void>
}

import { type UserContact, UserDirectory, type UserRole } from '../../../src/shared/contracts/user-directory'

/**
 * In-memory UserDirectory double (shared contract). Seed it with userId →
 * contact mappings; an unknown id resolves to null. Roles default to `athlete`;
 * seed one explicitly to test the coach path.
 */
export class FakeUserDirectory extends UserDirectory {
    private readonly byId = new Map<string, UserContact>()
    private readonly roles = new Map<string, UserRole>()

    seed(userId: string, contact: UserContact): this {
        this.byId.set(userId, contact)
        return this
    }

    seedRole(userId: string, role: UserRole): this {
        this.roles.set(userId, role)
        return this
    }

    async findUserIdByUsername(username: string): Promise<string | null> {
        for (const [id, contact] of this.byId) {
            if (contact.username === username) return id
        }
        return null
    }

    async findUserIdByEmail(email: string): Promise<string | null> {
        const wanted = email.toLowerCase()
        for (const [id, contact] of this.byId) {
            if (contact.email.toLowerCase() === wanted) return id
        }
        return null
    }

    async getContact(userId: string): Promise<UserContact | null> {
        return this.byId.get(userId) ?? null
    }

    async getRole(userId: string): Promise<UserRole | null> {
        const role = this.roles.get(userId)
        if (role) return role

        // A seeded user with no explicit role is an athlete; an unknown id is gone.
        return this.byId.has(userId) ? 'athlete' : null
    }
}

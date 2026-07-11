import { type UserContact, UserDirectory } from '../../../src/shared/contracts/user-directory'

/**
 * In-memory UserDirectory double (shared contract). Seed it with userId →
 * contact mappings; an unknown id resolves to null.
 */
export class FakeUserDirectory extends UserDirectory {
    private readonly byId = new Map<string, UserContact>()

    seed(userId: string, contact: UserContact): this {
        this.byId.set(userId, contact)
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
}

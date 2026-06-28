import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { AuthProvider, UserAggregate } from '../../../domain/entities/user.entity'
import { UserRepository } from '../../../domain/repositories/user.repository'
import type { EmailVO } from '../../../domain/value-objects/email.vo'
import { authIdentities } from '../schema/auth-identities.schema'
import { users } from '../schema/users.schema'
import { UserMapper } from '../mappers/user.mapper'

@Injectable()
export class DrizzleUserRepository extends UserRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<UserAggregate | null> {
        const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
        if (!row) return null
        const identities = await this.db.select().from(authIdentities).where(eq(authIdentities.userId, id))
        return UserMapper.toDomain(row, identities)
    }

    async findByEmail(email: EmailVO): Promise<UserAggregate | null> {
        const [row] = await this.db.select().from(users).where(eq(users.email, email.value)).limit(1)
        if (!row) return null

        const identities = await this.db.select().from(authIdentities).where(eq(authIdentities.userId, row.id))
        return UserMapper.toDomain(row, identities)
    }

    async findByIdentity(provider: AuthProvider, providerId: string): Promise<UserAggregate | null> {
        const [identity] = await this.db
            .select()
            .from(authIdentities)
            .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerId, providerId)))
            .limit(1)
        return identity ? this.findById(identity.userId) : null
    }

    async delete(id: string): Promise<void> {
        await this.db.delete(users).where(eq(users.id, id))
    }

    async save(user: UserAggregate): Promise<void> {
        const { user: row, identities } = UserMapper.toPersistence(user)
        await this.db.transaction(async (tx) => {
            await tx
                .insert(users)
                .values(row)
                .onConflictDoUpdate({
                    target: users.id,
                    set: {
                        email: row.email,
                        hashedPassword: row.hashedPassword,
                        units: row.units,
                        role: row.role,
                        isAdmin: row.isAdmin,
                        status: row.status,
                        emailVerifiedAt: row.emailVerifiedAt,
                        updatedAt: row.updatedAt,
                    },
                })
            if (identities.length > 0) {
                // Unique (provider, providerId) makes re-linking idempotent.
                await tx.insert(authIdentities).values(identities).onConflictDoNothing()
            }
        })
    }
}

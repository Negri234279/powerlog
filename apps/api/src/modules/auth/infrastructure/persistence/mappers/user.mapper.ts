import { type AuthIdentity, type AuthProvider, UserAggregate } from '../../../domain/entities/user.entity'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { PasswordHashVO } from '../../../domain/value-objects/password-hash.vo'
import { UnitsVO } from '../../../domain/value-objects/units.vo'
import { UserRoleVO } from '../../../domain/value-objects/user-role.vo'
import type { authIdentities } from '../schema/auth-identities.schema'
import type { users } from '../schema/users.schema'

type UserRow = typeof users.$inferSelect
type IdentityRow = typeof authIdentities.$inferSelect

export interface UserPersistence {
    user: typeof users.$inferInsert
    identities: (typeof authIdentities.$inferInsert)[]
}

/** Maps the User aggregate to/from its `users` + `auth_identities` rows. */
export const UserMapper = {
    toDomain(row: UserRow, identityRows: IdentityRow[]): UserAggregate {
        const identities: AuthIdentity[] = identityRows.map((i) => ({
            provider: i.provider,
            providerId: i.providerId,
        }))

        return UserAggregate.rehydrate({
            id: row.id,
            email: EmailVO.create(row.email),
            passwordHash: row.hashedPassword ? PasswordHashVO.fromHash(row.hashedPassword) : null,
            units: UnitsVO.create(row.units),
            role: UserRoleVO.create(row.role),
            isAdmin: row.isAdmin,
            status: row.status,
            emailVerifiedAt: row.emailVerifiedAt,
            identities,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })
    },

    toPersistence(user: UserAggregate): UserPersistence {
        return {
            user: {
                id: user.id,
                email: user.email.value,
                hashedPassword: user.passwordHash?.value ?? null,
                units: user.units.value,
                role: user.role.value,
                isAdmin: user.isAdmin,
                status: user.status,
                emailVerifiedAt: user.emailVerifiedAt,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            // Id/createdAt left to DB defaults; conflicts on (provider, providerId).
            identities: user.identities.map((i) => ({
                userId: user.id,
                provider: i.provider satisfies AuthProvider,
                providerId: i.providerId,
            })),
        }
    },
}

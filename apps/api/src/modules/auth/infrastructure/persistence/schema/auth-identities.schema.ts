import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { users } from './users.schema'

/** OAuth providers we can link to a user. Extend as providers are added. */
export const authProviderEnum = pgEnum('auth_provider', ['google'])

/**
 * `auth_identities` — external identities linked to a user (account linking).
 * A user may have a password and/or one identity per provider. Same email =>
 * same user, with the Google identity attached here.
 */
export const authIdentities = pgTable(
    'auth_identities',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: authProviderEnum('provider').notNull(),
        providerId: text('provider_id').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [unique('auth_identities_provider_id_unq').on(t.provider, t.providerId)],
)

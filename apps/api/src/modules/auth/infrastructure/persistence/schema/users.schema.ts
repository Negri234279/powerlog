import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Unit preference for displaying/logging weights. */
export const unitsEnum = pgEnum('units', ['kg', 'lb'])

/** User role. Orthogonal to `is_admin` (admin is not a role). */
export const userRoleEnum = pgEnum('user_role', ['athlete', 'coach'])

/** Account lifecycle: active · disabled (suspended) · deleted (GDPR soft-delete). */
export const accountStatusEnum = pgEnum('account_status', ['active', 'disabled', 'deleted'])

/**
 * `users` — the auth aggregate root.
 * `hashed_password` is nullable: Google-only accounts have no password.
 */
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    hashedPassword: text('hashed_password'),
    units: unitsEnum('units').notNull().default('kg'),
    role: userRoleEnum('role').notNull().default('athlete'),
    isAdmin: boolean('is_admin').notNull().default(false),
    status: accountStatusEnum('status').notNull().default('active'),
    // Null until the user confirms ownership via the verification email.
    // Google-registered accounts are verified at creation.
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

import { date, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Biological sex (binary, for powerlifting scoring/categories). */
export const profileSexEnum = pgEnum('profile_sex', ['male', 'female'])

/**
 * `profiles` — one row per user (PK = user_id, 1:1 with the auth `users` row).
 *
 * The link to `users` is a SOFT reference (no DB foreign key): adding a real FK
 * would force this infrastructure file to import the auth module's schema,
 * crossing a module boundary. Referential cleanup on account deletion will be
 * driven by an integration event instead.
 */
export const profiles = pgTable('profiles', {
    userId: uuid('user_id').primaryKey(),
    // Public handle: doubles as the display name. Unique, lowercase [a-z0-9_]{3,30}.
    displayName: text('display_name').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    birthDate: date('birth_date'),
    sex: profileSexEnum('sex'),
    heightCm: integer('height_cm'),
    bio: text('bio'),
    // Object-storage key of the avatar; null → default avatar. (Set by the avatar block.)
    avatarKey: text('avatar_key'),
    country: text('country'),
    timezone: text('timezone'),
    locale: text('locale'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

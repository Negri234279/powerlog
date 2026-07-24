import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Whose plan a template counts against: `personal` = athlete, `coaching` = coach. */
export const templateScopeEnum = pgEnum('template_scope', ['personal', 'coaching'])

/**
 * `workout_templates` — a reusable session blueprint. `owner_id` is a SOFT
 * reference to the auth `users` (no cross-module FK); cleanup on account
 * deletion will be driven by an integration event.
 */
export const workoutTemplates = pgTable('workout_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    // Personal (own training, athlete plan) or coaching (built for athletes, coach
    // plan). Decided at creation by which section the coach made it in.
    scope: templateScopeEnum('scope').notNull().default('personal'),
    name: text('name').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

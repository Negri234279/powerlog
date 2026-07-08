/**
 * Aggregated Drizzle schema barrel.
 *
 * Each module re-exports its tables here so the DB client is fully typed
 * (`NodePgDatabase<typeof schema>`). drizzle-kit discovers tables via the
 * glob in drizzle.config.ts, so this barrel is for runtime typing only.
 *
 * Populated per module, e.g.:
 *   export * from "../modules/workouts/infrastructure/persistence/schema/workout-sessions.schema";
 */
export * from '../modules/auth/infrastructure/persistence/schema/users.schema'
export * from '../modules/auth/infrastructure/persistence/schema/auth-identities.schema'
export * from '../modules/auth/infrastructure/persistence/schema/refresh-tokens.schema'
export * from '../modules/auth/infrastructure/persistence/schema/email-verification-tokens.schema'
export * from '../modules/auth/infrastructure/persistence/schema/password-reset-tokens.schema'
export * from '../modules/profile/infrastructure/persistence/schema/profiles.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/exercises.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/exercise-translations.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-sessions.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-exercise-entries.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-sets.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-templates.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-template-exercises.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/workout-template-sets.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/mesocycles.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/mesocycle-microcycles.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/mesocycle-days.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/mesocycle-day-exercises.schema'
export * from '../modules/workouts/infrastructure/persistence/schema/mesocycle-day-sets.schema'
export * from '../modules/notifications/infrastructure/persistence/schema/notifications.schema'
export * from '../modules/coaching/infrastructure/persistence/schema/coach-athlete-invitations.schema'
export * from '../modules/coaching/infrastructure/persistence/schema/coach-athlete.schema'

/**
 * Fixed taxonomy for the exercise catalog — the single source of truth shared by
 * the domain, the Drizzle pgEnums (infrastructure) and the GraphQL/zod layer.
 *
 * The three competition lifts get their own category (so per-lift PRs are a
 * direct GROUP BY); accessories are grouped by muscle region.
 */
export const EXERCISE_CATEGORIES = [
    'squat',
    'bench',
    'deadlift',
    'chest',
    'back',
    'shoulders',
    'legs',
    'arms',
    'core',
] as const
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number]

export const EXERCISE_EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as const
export type ExerciseEquipment = (typeof EXERCISE_EQUIPMENT)[number]

export const EXERCISE_MUSCLES = [
    'chest',
    'back',
    'lats',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core',
] as const
export type ExerciseMuscle = (typeof EXERCISE_MUSCLES)[number]

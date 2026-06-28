export const WORKOUT_STATUSES = ['planned', 'completed'] as const

/** A session is `planned` (e.g. by a coach) until the athlete logs it `completed`. */
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number]

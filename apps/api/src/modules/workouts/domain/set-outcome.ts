export const SET_OUTCOMES = ['success', 'failed'] as const

/**
 * How a set went once the athlete marked it done. A set with no outcome is
 * pending — that's the whole state machine, so there's no separate "completed"
 * flag to keep in sync with it.
 */
export type SetOutcome = (typeof SET_OUTCOMES)[number]

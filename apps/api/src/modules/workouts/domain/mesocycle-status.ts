export const MESOCYCLE_STATUSES = ['draft', 'active', 'completed', 'archived'] as const

/**
 * A mesocycle is `draft` while being built, `active` once the athlete starts
 * training it, then `completed` or `archived`.
 */
export type MesocycleStatus = (typeof MESOCYCLE_STATUSES)[number]

/**
 * Notification kinds. Single source of truth for the domain, the `notification_type`
 * pgEnum and any input validation. Extend as new notification-producing features
 * land (each addition needs a migration that `ALTER TYPE ... ADD VALUE`s it).
 */
export const NOTIFICATION_TYPES = [
    'coach_invitation',
    'coach_linked',
    'athlete_linked',
    'session_planned',
    'mesocycle_assigned',
    'mesocycle_week_generated',
    'coach_unlinked',
    'athlete_unlinked',
    'subscription_activated',
    'subscription_canceled',
    'subscription_payment_failed',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

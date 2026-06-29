import posthog from 'posthog-js'

// Single source of truth for product event names and their property shapes.
//
// Conventions (mirror the API's observability rules in CLAUDE.md):
// - snake_case, stable names — treat them as a public contract.
// - properties stay low-cardinality and PII-free: no emails, tokens, free text
//   or raw ids. Use bounded enums (method / action / code).
//
// More events (coach_invite_sent, …) are added here as their UI lands, so the
// catalog always matches what the app can actually emit.
type EmptyProps = Record<string, never>

export interface AnalyticsEventMap {
    user_registered: { method: 'password' }
    user_logged_in: { method: 'password' }
    user_logged_out: EmptyProps
    auth_failed: { action: 'register' | 'login'; code: string }
    profile_updated: EmptyProps
    avatar_updated: EmptyProps
    avatar_removed: EmptyProps
    password_changed: EmptyProps
    password_reset: EmptyProps
    email_verified: EmptyProps
    workout_session_created: EmptyProps
    workout_session_updated: EmptyProps
    workout_session_deleted: EmptyProps
    workout_template_created: EmptyProps
    workout_template_updated: EmptyProps
    workout_template_deleted: EmptyProps
    session_created_from_template: EmptyProps
    set_logged: EmptyProps
    session_completed: EmptyProps
}

export type AnalyticsEventName = keyof AnalyticsEventMap

/** Capture a typed product event — properties are enforced by the catalog. */
export function track<K extends AnalyticsEventName>(name: K, properties: AnalyticsEventMap[K]): void {
    posthog.capture(name, properties)
}

/** Tie the current person to the authenticated user once their id is known.
 *  username is a public handle (not PII); never pass email here. */
export function identifyUser(userId: string, username: string): void {
    posthog.identify(userId, { username })
}

/** Drop the identity on logout so the next visitor on this device starts anew. */
export function resetAnalytics(): void {
    posthog.reset()
}

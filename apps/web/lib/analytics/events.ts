import { faroApi } from './faro'

// Single source of truth for product event names and their property shapes.
// Events land in Loki (kind=event) via Alloy's faro.receiver, queryable in
// Grafana next to the API's logs and alertable from the same stack.
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
    mesocycle_created: EmptyProps
    mesocycle_updated: EmptyProps
    mesocycle_deleted: EmptyProps
    mesocycle_status_changed: { status: 'draft' | 'active' | 'completed' | 'archived' }
    mesocycle_week_generated: EmptyProps
    session_created_from_template: EmptyProps
    set_logged: EmptyProps
    session_completed: EmptyProps
    // BYOK AI settings. `provider` is a bounded enum; the key never appears here.
    ai_key_configured: { provider: 'openai' | 'anthropic' }
    ai_key_removed: { provider: 'openai' | 'anthropic' }
    ai_model_selected: { provider: 'openai' | 'anthropic' }
    ai_provider_toggled: { provider: 'openai' | 'anthropic'; action: 'enabled' | 'disabled' }
    ai_default_provider_changed: { provider: 'openai' | 'anthropic' }
    // AI-programmed sessions. No session or exercise ids: unbounded, and PII-shaped.
    ai_plan_generated: { scope: 'session' | 'exercise' }
    ai_plan_refined: EmptyProps
    ai_plan_accepted: EmptyProps
    ai_plan_discarded: EmptyProps
    // AI-designed training blocks. Faro attributes are strings; both are small
    // bounded integers (1–52 weeks, 1–7 days), so cardinality stays low.
    ai_mesocycle_generated: { weeks: string; days: string }
    ai_mesocycle_refined: EmptyProps
    ai_mesocycle_accepted: EmptyProps
    ai_mesocycle_discarded: EmptyProps
    // Billing. The server owns the funnel (started / completed / expired, by
    // webhook); this is the one step only the client sees — the gateway sending
    // the user back. `cancelled` is the walk-away PayPal never reports.
    checkout_returned: { result: 'success' | 'cancelled' }
    // Emitted only by TrackedButton / TrackedLink (components/ui/tracked.tsx);
    // `id` is the finite set of analyticsId literals used across the app.
    ui_click: { id: string; kind: 'button' | 'link' }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

/** Capture a typed product event — properties are enforced by the catalog. */
export function track<K extends AnalyticsEventName>(name: K, properties: AnalyticsEventMap[K]): void {
    // Faro event attributes are string-valued; the catalog only allows strings.
    faroApi()?.pushEvent(name, properties)
}

/** Tie the session to the authenticated user once their id is known.
 *  username is a public handle (not PII); never pass email here. */
export function identifyUser(userId: string, username: string): void {
    faroApi()?.setUser({ id: userId, username })
}

/** Drop the identity on logout so the next visitor on this device starts anew. */
export function resetAnalytics(): void {
    faroApi()?.resetUser()
}

/** Login mechanism. */
export type LoginMethod = 'password' | 'google'

/** Outcome of a login attempt. */
export type LoginOutcome = 'success' | 'failure'

/**
 * Outcome of a refresh-session attempt:
 * - `rotated`: the token was valid and a new one was issued in the same family.
 * - `reuse_detected`: an already-revoked token was replayed (likely theft) →
 *   the whole family is revoked. This is the security signal worth alerting on.
 * - `invalid`: token missing/expired/unknown user (no reuse).
 */
export type RefreshOutcome = 'rotated' | 'reuse_detected' | 'invalid'

/** How a new account was created. */
export type RegistrationMethod = 'password' | 'google'

/**
 * Abstracts the auth observability counters so the application handlers stay
 * free of prom-client. Infrastructure binds it to a Prometheus-backed adapter;
 * tests use a recording fake.
 */
export abstract class AuthMetrics {
    abstract recordLogin(method: LoginMethod, outcome: LoginOutcome): void
    abstract recordRefresh(outcome: RefreshOutcome): void
    abstract recordRegistration(method: RegistrationMethod): void
}

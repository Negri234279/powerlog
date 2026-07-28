/**
 * A one-shot signal, set by the failed-refresh logout redirect and read by the
 * proxy. After a dead refresh we bounce the user to /login and try to drop the
 * auth cookies — but if the HTTPOnly refresh cookie somehow survives (e.g. a
 * Domain mismatch), the proxy would see a "session" on /login and redirect back
 * to /dashboard, which fails the refresh again → an infinite loop. This marker
 * lets the proxy keep the user on /login for one hop and then consume it, so the
 * loop can't form and a later genuine login is unaffected.
 *
 * Plain constants only (no `server-only`, no node built-ins) so the Edge proxy
 * can import them alongside the Node route handler.
 */
export const LOGOUT_MARKER_COOKIE = 'pl_lo'

/** Short-lived: it only needs to survive the redirect hop to /login (seconds). */
export const LOGOUT_MARKER_MAX_AGE_SECONDS = 30

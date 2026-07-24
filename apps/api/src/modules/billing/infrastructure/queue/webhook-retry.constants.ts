/**
 * The backoff schedule, shared by both {@link WebhookRetryQueue} adapters so the
 * durable path and the in-process fallback behave the same.
 *
 * 5 tries with exponential backoff from 5s — ~5s, 10s, 20s, 40s, 80s, under three
 * minutes total — which outlasts the seconds-long webhook ordering gaps and most
 * transient database/gateway hiccups without holding a retry around forever.
 */
export const RETRY_ATTEMPTS = 5
export const RETRY_BACKOFF_MS = 5_000

/** The delay before attempt number `attemptsMade + 1` (1-based made count). */
export function backoffDelayMs(attemptsMade: number): number {
    return RETRY_BACKOFF_MS * 2 ** (attemptsMade - 1)
}

import { ClientError } from 'graphql-request'

/**
 * A short, user-safe message from a GraphQL/network error.
 *
 * Prefers the API's domain message (`errors[0].message`). For non-GraphQL
 * responses (e.g. a 404 HTML page when the proxy/API is down) it returns a
 * clean status line — never the raw response body or graphql-request's giant
 * stringified message.
 */
export function gqlErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof ClientError) {
        const first = error.response.errors?.[0]
        if (first?.message) return first.message

        const status = error.response.status
        if (status === 404 || status === 502 || status === 503) {
            return "Couldn't reach the server. Is the API running?"
        }
        return status ? `Request failed (HTTP ${status}).` : fallback
    }
    return fallback
}

/**
 * The API's stable domain error code (`extensions.code`, e.g. INVALID_CREDENTIALS),
 * or 'UNKNOWN'. Safe to use as a low-cardinality analytics property — unlike the
 * human message, it's a bounded enum and carries no PII.
 */
export function gqlErrorCode(error: unknown): string {
    if (error instanceof ClientError) {
        const code = error.response.errors?.[0]?.extensions?.['code']
        if (typeof code === 'string') return code
    }
    return 'UNKNOWN'
}

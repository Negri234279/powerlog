/**
 * What the auth commands return to the presentation layer. The raw tokens are
 * set as HTTPOnly cookies by the resolver/controller — never exposed in the
 * GraphQL response body.
 */
export interface AuthSessionResult {
    userId: string
    accessToken: string
    refreshToken: string
}

/**
 * Verified Google profile fields the backend extracts after the OAuth code
 * exchange. Defined in the application layer so the infra strategy and the
 * presentation controller share it without crossing layer boundaries.
 */
export interface GoogleProfile {
    googleId: string
    email: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureUrl?: string
}

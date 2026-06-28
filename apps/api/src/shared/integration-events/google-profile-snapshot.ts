/**
 * Snapshot of the Google profile fields captured during OAuth, carried on
 * cross-module integration events so the profile module can seed name/avatar
 * without importing the auth module. All fields optional: Google may omit them.
 */
export interface GoogleProfileSnapshot {
    displayName?: string
    firstName?: string
    lastName?: string
    pictureUrl?: string
}

/**
 * Profile tuning the application layer needs without reading env directly.
 * Bound in infrastructure from validated config.
 */
export abstract class ProfileConfig {
    /** URL of the default avatar shown when a user has none ('' → none). */
    abstract readonly defaultAvatarUrl: string
}

/**
 * A user's role changed. Published by auth, and consumed by whoever has to react
 * without importing auth — today the entitlements cache.
 *
 * It matters because the role picks the catalog: with no live subscription, a
 * user's entitlements are the free plan OF THEIR ROLE. So a role change silently
 * changes what they may do, and a cached answer from a second ago is now wrong.
 */
export class UserRoleChangedIntegrationEvent {
    constructor(
        readonly userId: string,
        /** The role now in force ("athlete" | "coach"). */
        readonly role: string,
    ) {}
}

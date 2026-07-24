/**
 * The plan catalog itself changed — a plan's entitlements were edited, or a plan
 * was published/archived.
 *
 * It matters because **entitlement changes are retroactive by design**: granting
 * AI to the Pro plan has to reach everyone on Pro at once, without them
 * re-subscribing. Anything holding a cached answer to "what may this user do" has
 * to drop it, and it cannot know who is affected without asking — which is the
 * very thing it cached.
 */
export class PlanCatalogChangedIntegrationEvent {
    constructor(
        readonly planId: string,
        readonly planSlug: string,
    ) {}
}

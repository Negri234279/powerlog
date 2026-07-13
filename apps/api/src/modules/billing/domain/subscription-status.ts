/**
 * Where a subscription is in its life. The gateway is the source of truth for
 * the money; this is the local projection we decide entitlements from.
 *
 * - `incomplete` — checkout started, first payment not confirmed yet.
 * - `trialing`   — inside a trial (payment method already on file).
 * - `active`     — paid and current.
 * - `past_due`   — a charge failed and the gateway is retrying (dunning).
 * - `canceled`   — it will not renew. Still entitled until `currentPeriodEnd`.
 * - `expired`    — over: the paid period elapsed, or the gateway gave up.
 */
export type SubscriptionStatus = 'incomplete' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'

/**
 * The statuses that grant a plan's entitlements outright.
 *
 * `past_due` is in: the gateway is still retrying, and cutting access on the
 * first failed charge would punish an expired card. When the gateway gives up it
 * sends the cancellation webhook, and access falls with it.
 *
 * `canceled` is NOT here — it grants access only while `currentPeriodEnd` is in
 * the future, which is the rule in `SubscriptionAggregate.isEntitledAt`.
 */
export const ENTITLING_STATUSES: readonly SubscriptionStatus[] = ['trialing', 'active', 'past_due']

/**
 * The statuses a "live" subscription can have — the ones the one-per-user index
 * covers. A canceled subscription still holds its slot until it expires, so the
 * user cannot start a second one on top of the time they already paid for.
 */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = [...ENTITLING_STATUSES, 'incomplete', 'canceled']

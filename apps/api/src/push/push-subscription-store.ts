import type { PushSubscriptionInput, StoredPushSubscription } from './push.types'

/**
 * Storage port for browser push subscriptions. Abstract (not an interface) so it
 * doubles as the DI token — injected as a value import, per the project's
 * emitDecoratorMetadata rule.
 */
export abstract class PushSubscriptionStore {
    /** Insert, or update the existing row for this endpoint (re-register). */
    abstract save(subscription: PushSubscriptionInput): Promise<void>

    /** Remove one of the caller's subscriptions by endpoint. Returns whether a
     *  row was deleted (someone else's endpoint simply matches nothing). */
    abstract removeByEndpoint(userId: string, endpoint: string): Promise<boolean>

    /** Every subscription belonging to any of these users (the fan-out set). */
    abstract findByUsers(userIds: readonly string[]): Promise<StoredPushSubscription[]>

    /** Prune a subscription the push service reported as gone (404/410). */
    abstract deleteByEndpoint(endpoint: string): Promise<void>
}

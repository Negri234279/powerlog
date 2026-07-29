import type { PushInput } from './push.types'

/**
 * The high-level seam the domain talks to: integration-event handlers (Push.4)
 * inject this and `send()` a payload to the affected users. Best-effort — it
 * never throws and no-ops when push is unconfigured or the users have no
 * subscriptions, exactly like `RealtimeHub.publish`. Abstract so it doubles as
 * the DI token.
 *
 * `payload` may be a per-locale factory, so one event renders in each recipient
 * device's own language (the locale is stored on the subscription).
 */
export abstract class PushNotifier {
    abstract send(userIds: readonly string[], payload: PushInput): Promise<void>
}

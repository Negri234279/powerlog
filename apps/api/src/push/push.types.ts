/**
 * The user-visible content of a push notification. Unlike a realtime SSE event
 * (which carries only `{type}` and lets the client refetch), a push renders on a
 * locked screen with the app closed, so it must carry the text itself. Keep it
 * minimal; `url` is the deep link opened on click, `tag` collapses repeats of the
 * same subject (e.g. one chat) instead of stacking them.
 */
export interface PushPayload {
    title: string
    body: string
    url?: string
    tag?: string
}

/** Builds the payload for one device's locale — so the same event renders in each
 *  recipient's language (the locale is stored per subscription). */
export type PushPayloadFactory = (locale: string) => PushPayload

/** What `PushNotifier.send` accepts: a ready payload (same text for everyone) or a
 *  per-locale factory (localised per device). */
export type PushInput = PushPayload | PushPayloadFactory

/** A subscription as the browser hands it to us, on register. */
export interface PushSubscriptionInput {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    locale: string
    userAgent?: string | null
}

/** A subscription as stored, needed to deliver a push to it. */
export interface StoredPushSubscription {
    userId: string
    endpoint: string
    p256dh: string
    auth: string
    locale: string
}

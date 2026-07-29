import { graphql } from '@/lib/graphql/__generated__'

// ── Web Push subscriptions ───────────────────────────────────

/** The VAPID public key for `pushManager.subscribe`; null ⇒ push is off server-side. */
export const PushPublicKeyDocument = graphql(`
    query PushPublicKey {
        pushPublicKey
    }
`)

export const RegisterPushSubscriptionDocument = graphql(`
    mutation RegisterPushSubscription($input: RegisterPushSubscriptionInput!) {
        registerPushSubscription(input: $input)
    }
`)

export const RemovePushSubscriptionDocument = graphql(`
    mutation RemovePushSubscription($endpoint: String!) {
        removePushSubscription(endpoint: $endpoint)
    }
`)

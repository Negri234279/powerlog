import { graphql } from '@/lib/graphql/__generated__'

/** Health of each payment integration — the operator's first look. */
export const AdminGatewayStatusDocument = graphql(`
    query AdminGatewayStatus {
        adminGatewayStatus {
            gateway
            configured
            syncedPlans
            totalPlans
            lastWebhookAt
            failedWebhooks
        }
    }
`)

/** The webhook journal. `failed` rows are the ones with a retry button. */
export const AdminWebhookEventsDocument = graphql(`
    query AdminWebhookEvents($status: String, $gateway: String, $limit: Int) {
        adminWebhookEvents(status: $status, gateway: $gateway, limit: $limit) {
            total
            rows {
                id
                gateway
                eventId
                type
                status
                error
                receivedAt
                processedAt
            }
        }
    }
`)

/**
 * Runs the reconciliation on demand. Should be 0 — anything else is a webhook we
 * never received, which is the one billing bug that hides in silence.
 */
export const AdminBillingDriftDocument = graphql(`
    query AdminBillingDrift {
        adminBillingDrift {
            gateway
            total
            missingLocally
            staleLocally
        }
    }
`)

export const RetryWebhookEventDocument = graphql(`
    mutation RetryWebhookEvent($id: ID!) {
        retryWebhookEvent(id: $id)
    }
`)

export const SyncPlanToGatewayDocument = graphql(`
    mutation SyncPlanToGateway($planId: ID!, $gateway: String!) {
        syncPlanToGateway(planId: $planId, gateway: $gateway)
    }
`)

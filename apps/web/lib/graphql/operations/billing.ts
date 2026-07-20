import { graphql } from '@/lib/graphql/__generated__'

// ── Catalog (admin) ──────────────────────────────────────────

export const AdminPlansDocument = graphql(`
    query AdminPlans($audience: String) {
        adminPlans(audience: $audience) {
            id
            audience
            slug
            name
            description
            status
            isFree
            sortOrder
            highlighted
            entitlements
            stripeProductId
            paypalProductId
            snapshot {
                maxTemplates
                maxMesocycles
                maxWorkouts
                ai
                planSessions
                maxAthletes
            }
            prices {
                id
                interval
                currency
                amountCents
                active
                stripePriceId
                paypalPlanId
            }
            translations {
                locale
                name
                description
            }
            offer {
                id
                name
                message
                trialDays
                introPhase {
                    cycles
                    percentOff
                }
                startsAt
                endsAt
            }
        }
    }
`)

/**
 * The JSON Schema of what an audience's plans may grant. The plan form renders
 * itself from this, so a feature added to the API's zod schema shows up as a new
 * field with no change here.
 */
export const AdminPlanEntitlementsSchemaDocument = graphql(`
    query AdminPlanEntitlementsSchema($audience: String!) {
        adminPlanEntitlementsSchema(audience: $audience)
    }
`)

export const CreatePlanDocument = graphql(`
    mutation CreatePlan($input: CreatePlanInput!) {
        createPlan(input: $input)
    }
`)

export const UpdatePlanDocument = graphql(`
    mutation UpdatePlan($input: UpdatePlanInput!) {
        updatePlan(input: $input)
    }
`)

export const SetPlanStatusDocument = graphql(`
    mutation SetPlanStatus($id: ID!, $status: String!) {
        setPlanStatus(id: $id, status: $status)
    }
`)

export const AddPlanPriceDocument = graphql(`
    mutation AddPlanPrice($input: AddPlanPriceInput!) {
        addPlanPrice(input: $input)
    }
`)

export const DeactivatePlanPriceDocument = graphql(`
    mutation DeactivatePlanPrice($id: ID!) {
        deactivatePlanPrice(id: $id)
    }
`)

export const UpsertPlanOfferDocument = graphql(`
    mutation UpsertPlanOffer($input: UpsertPlanOfferInput!) {
        upsertPlanOffer(input: $input)
    }
`)

export const DeactivatePlanOfferDocument = graphql(`
    mutation DeactivatePlanOffer($id: ID!) {
        deactivatePlanOffer(id: $id)
    }
`)

// ── Subscriptions + figures (admin) ──────────────────────────

export const AdminBillingStatsDocument = graphql(`
    query AdminBillingStats {
        adminBillingStats {
            activeSubscriptions
            trialing
            pastDue
            canceling
            byStatus {
                status
                gateway
                count
            }
            byPlan {
                plan
                audience
                count
            }
            mrr {
                plan
                currency
                amountCents
            }
        }
    }
`)

export const AdminSubscriptionsDocument = graphql(`
    query AdminSubscriptions(
        $status: String
        $gateway: String
        $planId: ID
        $search: String
        $limit: Int
        $offset: Int
    ) {
        adminSubscriptions(
            status: $status
            gateway: $gateway
            planId: $planId
            search: $search
            limit: $limit
            offset: $offset
        ) {
            rows {
                id
                userId
                email
                username
                planSlug
                planName
                gateway
                status
                amountCents
                currency
                interval
                currentPeriodEnd
                cancelAtPeriodEnd
            }
            total
            limit
            offset
        }
    }
`)

export const AdminAssignSubscriptionDocument = graphql(`
    mutation AdminAssignSubscription($input: AssignSubscriptionInput!) {
        adminAssignSubscription(input: $input)
    }
`)

export const AdminRevokeSubscriptionDocument = graphql(`
    mutation AdminRevokeSubscription($id: ID!) {
        adminRevokeSubscription(id: $id)
    }
`)

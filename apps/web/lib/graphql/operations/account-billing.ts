import { graphql } from '@/lib/graphql/__generated__'

/** The pricing page: what is on sale for my audience, and what each plan gives. */
export const AvailablePlansDocument = graphql(`
    query AvailablePlans($audience: String!) {
        availablePlans(audience: $audience) {
            id
            slug
            name
            description
            isFree
            sortOrder
            templates
            mesocycles
            ai
            planSessions
            maxAthletes
            prices {
                id
                interval
                currency
                amountCents
                gateways
            }
            offer {
                id
                name
                trialDays
                introPhase {
                    cycles
                    percentOff
                }
                endsAt
            }
        }
    }
`)

export const MyPlanDocument = graphql(`
    query MyPlan {
        myEntitlements {
            plan
            audience
            templates
            mesocycles
            ai
            planSessions
            maxAthletes
        }
        mySubscription {
            id
            planSlug
            planName
            gateway
            status
            amountCents
            currency
            interval
            currentPeriodEnd
            cancelAtPeriodEnd
            pendingPlanSlug
            canResume
        }
    }
`)

export const MyInvoicesDocument = graphql(`
    query MyInvoices($limit: Int, $offset: Int) {
        myInvoices(limit: $limit, offset: $offset) {
            total
            rows {
                id
                number
                status
                amountPaidCents
                amountDueCents
                currency
                hostedUrl
                pdfUrl
                issuedAt
            }
        }
    }
`)

export const BillingPortalUrlDocument = graphql(`
    query BillingPortalUrl {
        billingPortalUrl
    }
`)

export const StartCheckoutDocument = graphql(`
    mutation StartCheckout($planPriceId: ID!, $gateway: String!, $offerId: ID) {
        startCheckout(planPriceId: $planPriceId, gateway: $gateway, offerId: $offerId)
    }
`)

export const CancelSubscriptionDocument = graphql(`
    mutation CancelSubscription {
        cancelSubscription
    }
`)

export const ResumeSubscriptionDocument = graphql(`
    mutation ResumeSubscription {
        resumeSubscription
    }
`)

export const ChangePlanDocument = graphql(`
    mutation ChangePlan($planPriceId: ID!) {
        changePlan(planPriceId: $planPriceId)
    }
`)

import { graphql } from '@/lib/graphql/__generated__'

/** The pricing page: what is on sale for my audience, and what each plan gives. */
export const AvailablePlansDocument = graphql(`
    query AvailablePlans($audience: String!, $locale: String) {
        availablePlans(audience: $audience, locale: $locale) {
            id
            slug
            name
            description
            isFree
            sortOrder
            maxTemplates
            maxMesocycles
            maxWorkouts
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
                message
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

// Athlete and coach plans are independent subscriptions, so this fetches both
// sections of the entitlements and both subscriptions (aliased by audience) in one
// round-trip. `coach` is null for users who do no coaching.
export const MyPlanDocument = graphql(`
    query MyPlan {
        myEntitlements {
            athlete {
                plan
                maxTemplates
                maxMesocycles
                maxWorkouts
                ai
            }
            coach {
                plan
                maxAthletes
                planSessions
                maxTemplates
                maxMesocycles
                ai
            }
        }
        athleteSubscription: mySubscription(audience: "athlete") {
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
        coachSubscription: mySubscription(audience: "coach") {
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

/** The caller's self-created counts, shown as "used / limit" against their plan caps. */
export const MyWorkoutUsageDocument = graphql(`
    query MyWorkoutUsage {
        myWorkoutUsage {
            templates
            mesocycles
            workouts
        }
    }
`)

export const MyInvoicesDocument = graphql(`
    query MyInvoices($limit: Int, $offset: Int) {
        myInvoices(limit: $limit, offset: $offset) {
            total
            rows {
                id
                gateway
                number
                status
                amountPaidCents
                amountDueCents
                currency
                hostedUrl
                pdfUrl
                receiptUrl
                issuedAt
            }
        }
    }
`)

export const BillingPortalUrlDocument = graphql(`
    query BillingPortalUrl($audience: String!) {
        billingPortalUrl(audience: $audience)
    }
`)

/** Whether the signed-in user can still get a free trial in an audience — used to
 *  hide a trial the checkout would not honour to a returning subscriber. */
export const TrialEligibleDocument = graphql(`
    query TrialEligible($audience: String!) {
        trialEligible(audience: $audience)
    }
`)

export const StartCheckoutDocument = graphql(`
    mutation StartCheckout($planPriceId: ID!, $gateway: String!, $offerId: ID, $embedded: Boolean, $returnTo: String) {
        startCheckout(
            planPriceId: $planPriceId
            gateway: $gateway
            offerId: $offerId
            embedded: $embedded
            returnTo: $returnTo
        ) {
            url
            clientSecret
        }
    }
`)

export const CancelSubscriptionDocument = graphql(`
    mutation CancelSubscription($audience: String!) {
        cancelSubscription(audience: $audience)
    }
`)

export const ResumeSubscriptionDocument = graphql(`
    mutation ResumeSubscription($audience: String!) {
        resumeSubscription(audience: $audience)
    }
`)

export const ChangePlanDocument = graphql(`
    mutation ChangePlan($planPriceId: ID!) {
        changePlan(planPriceId: $planPriceId)
    }
`)

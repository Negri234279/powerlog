import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'

import type { AvailablePlansQuery, MyInvoicesQuery, MyPlanQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AvailablePlansDocument,
    BillingPortalUrlDocument,
    CancelSubscriptionDocument,
    ChangePlanDocument,
    MyInvoicesDocument,
    MyPlanDocument,
    MyWorkoutUsageDocument,
    ResumeSubscriptionDocument,
    StartCheckoutDocument,
} from '@/lib/graphql/operations/account-billing'

export type PublicPlan = AvailablePlansQuery['availablePlans'][number]
export type PublicPrice = PublicPlan['prices'][number]
export type MySubscription = NonNullable<MyPlanQuery['athleteSubscription']>
export type MyEntitlements = MyPlanQuery['myEntitlements']
export type AthleteEntitlements = MyEntitlements['athlete']
export type CoachEntitlements = NonNullable<MyEntitlements['coach']>
export type MyInvoice = MyInvoicesQuery['myInvoices']['rows'][number]

/** Which catalog / subscription an action targets. */
export type PlanAudience = 'athlete' | 'coach'

export const MY_PLAN_KEY = ['myPlan']
const INVOICES_KEY = ['myInvoices']

/** The user's plan + subscription. Refetched when the realtime stream says so. */
export function useMyPlan() {
    return useQuery({
        queryKey: MY_PLAN_KEY,
        queryFn: () => gqlRequest(MyPlanDocument),
        staleTime: 30_000,
    })
}

/** How many templates/mesocycles/workouts the user has created, for the usage readout. */
export function useMyWorkoutUsage() {
    return useQuery({
        queryKey: ['myWorkoutUsage'],
        queryFn: () => gqlRequest(MyWorkoutUsageDocument).then((r) => r.myWorkoutUsage),
        staleTime: 30_000,
    })
}

export function useAvailablePlans(audience: string) {
    // The plan names/descriptions come localized to whatever the app is showing.
    const locale = useLocale()

    return useQuery({
        queryKey: ['availablePlans', audience, locale],
        queryFn: () => gqlRequest(AvailablePlansDocument, { audience, locale }).then((r) => r.availablePlans),
        staleTime: 5 * 60_000,
    })
}

export function useMyInvoices() {
    return useQuery({
        queryKey: INVOICES_KEY,
        queryFn: () => gqlRequest(MyInvoicesDocument, { limit: 24, offset: 0 }).then((r) => r.myInvoices),
    })
}

/**
 * The billing portal for the subscription in an audience. Null when the gateway
 * has no portal (PayPal), the plan is free/manual, or there is no subscription —
 * so the "manage payment method" button hides. `enabled` lets the caller skip the
 * request when there is plainly nothing to manage (free plan, manual grant).
 */
export function useBillingPortalUrl(audience: PlanAudience, enabled = true) {
    return useQuery({
        queryKey: ['billingPortalUrl', audience],
        queryFn: () => gqlRequest(BillingPortalUrlDocument, { audience }).then((r) => r.billingPortalUrl),
        staleTime: 60_000,
        enabled,
    })
}

/**
 * Sends the browser to the gateway. Nothing is subscribed when this resolves —
 * the subscription is created by the webhook — so there is no cache to update
 * here; the redirect leaves the page anyway.
 */
export function useStartCheckout() {
    return useMutation({
        mutationFn: (input: {
            planPriceId: string
            gateway: string
            offerId?: string | null
            // Where a hosted redirect returns to: 'plan' (default) or 'dashboard'
            // (the sign-up wizard). Ignored by the embedded flow, which never redirects.
            returnTo?: 'plan' | 'dashboard'
        }) =>
            gqlRequest(StartCheckoutDocument, {
                planPriceId: input.planPriceId,
                gateway: input.gateway,
                offerId: input.offerId ?? null,
                returnTo: input.returnTo ?? null,
            }).then((r) => r.startCheckout),
        // The redirect flow: hosted checkouts (PayPal, Stripe hosted) hand back a URL.
        // The embedded flow reads `clientSecret` off the mutation itself and mounts it
        // in-page, so it does not go through this hook.
        onSuccess: (session) => {
            if (session.url) window.location.assign(session.url)
        },
    })
}

/**
 * A client secret for an **embedded** Stripe checkout, shaped for
 * `<EmbeddedCheckoutProvider>`'s `fetchClientSecret`. Unlike {@link useStartCheckout}
 * (which redirects on a hosted URL), this hands back the secret the provider mounts
 * in-page. Throws when Stripe returns none — the provider surfaces it as a load error.
 */
export async function fetchEmbeddedCheckoutSecret(input: {
    planPriceId: string
    offerId?: string | null
}): Promise<string> {
    const result = await gqlRequest(StartCheckoutDocument, {
        planPriceId: input.planPriceId,
        gateway: 'stripe',
        offerId: input.offerId ?? null,
        embedded: true,
    })
    const secret = result.startCheckout.clientSecret
    if (!secret) throw new Error('Stripe returned no client secret for the embedded checkout')

    return secret
}

/**
 * Cancel / resume / change plan are **requests to the gateway**: the local state
 * moves when the webhook lands. So these invalidate optimistically (the page will
 * usually still show the old value for a moment) and the realtime
 * `subscription_updated` event is what actually settles it.
 */
function useSubscriptionAction<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY })
        },
    })
}

export function useCancelSubscription(audience: PlanAudience) {
    return useSubscriptionAction(() => gqlRequest(CancelSubscriptionDocument, { audience }))
}

export function useResumeSubscription(audience: PlanAudience) {
    return useSubscriptionAction(() => gqlRequest(ResumeSubscriptionDocument, { audience }))
}

/**
 * Switching plan. Stripe applies it and returns nothing; **PayPal hands back an
 * approval URL** — the subscriber has to say yes again — so if there is one, the
 * browser goes there. Either way the change only becomes real when the webhook
 * lands.
 */
export function useChangePlan() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (planPriceId: string) => gqlRequest(ChangePlanDocument, { planPriceId }).then((r) => r.changePlan),
        onSuccess: (approvalUrl) => {
            if (approvalUrl) {
                window.location.assign(approvalUrl)

                return
            }

            void queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY })
        },
    })
}

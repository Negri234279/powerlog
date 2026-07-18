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

/** Null when the gateway has no portal (or there is no subscription): the button hides. */
export function useBillingPortalUrl() {
    return useQuery({
        queryKey: ['billingPortalUrl'],
        queryFn: () => gqlRequest(BillingPortalUrlDocument).then((r) => r.billingPortalUrl),
        staleTime: 60_000,
    })
}

/**
 * Sends the browser to the gateway. Nothing is subscribed when this resolves —
 * the subscription is created by the webhook — so there is no cache to update
 * here; the redirect leaves the page anyway.
 */
export function useStartCheckout() {
    return useMutation({
        mutationFn: (input: { planPriceId: string; gateway: string; offerId?: string | null }) =>
            gqlRequest(StartCheckoutDocument, {
                planPriceId: input.planPriceId,
                gateway: input.gateway,
                offerId: input.offerId ?? null,
            }).then((r) => r.startCheckout),
        onSuccess: (url) => {
            window.location.assign(url)
        },
    })
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

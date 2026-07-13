import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AvailablePlansQuery, MyInvoicesQuery, MyPlanQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AvailablePlansDocument,
    BillingPortalUrlDocument,
    CancelSubscriptionDocument,
    ChangePlanDocument,
    MyInvoicesDocument,
    MyPlanDocument,
    ResumeSubscriptionDocument,
    StartCheckoutDocument,
} from '@/lib/graphql/operations/account-billing'

export type PublicPlan = AvailablePlansQuery['availablePlans'][number]
export type PublicPrice = PublicPlan['prices'][number]
export type MySubscription = NonNullable<MyPlanQuery['mySubscription']>
export type MyEntitlements = MyPlanQuery['myEntitlements']
export type MyInvoice = MyInvoicesQuery['myInvoices']['rows'][number]

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

export function useAvailablePlans(audience: string) {
    return useQuery({
        queryKey: ['availablePlans', audience],
        queryFn: () => gqlRequest(AvailablePlansDocument, { audience }).then((r) => r.availablePlans),
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

export function useCancelSubscription() {
    return useSubscriptionAction(() => gqlRequest(CancelSubscriptionDocument))
}

export function useResumeSubscription() {
    return useSubscriptionAction(() => gqlRequest(ResumeSubscriptionDocument))
}

export function useChangePlan() {
    return useSubscriptionAction((planPriceId: string) => gqlRequest(ChangePlanDocument, { planPriceId }))
}

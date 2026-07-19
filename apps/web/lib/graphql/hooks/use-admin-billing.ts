import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AdminPlansQuery, AdminSubscriptionsQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AddPlanPriceDocument,
    AdminAssignSubscriptionDocument,
    AdminBillingStatsDocument,
    AdminPlanEntitlementsSchemaDocument,
    AdminPlansDocument,
    AdminRevokeSubscriptionDocument,
    AdminSubscriptionsDocument,
    CreatePlanDocument,
    DeactivatePlanPriceDocument,
    SetPlanStatusDocument,
    UpdatePlanDocument,
} from '@/lib/graphql/operations/billing'

export type AdminPlan = AdminPlansQuery['adminPlans'][number]
export type AdminPlanPrice = AdminPlan['prices'][number]
export type AdminSubscription = AdminSubscriptionsQuery['adminSubscriptions']['rows'][number]

const PLANS_KEY = ['adminPlans']
const SUBSCRIPTIONS_KEY = ['adminSubscriptions']
const BILLING_STATS_KEY = ['adminBillingStats']
const PAGE_SIZE = 25

/** Everything a plan change can move: the catalog, the subscriptions on it, and the figures. */
function useBillingInvalidator() {
    const queryClient = useQueryClient()

    return () => {
        void queryClient.invalidateQueries({ queryKey: PLANS_KEY })
        void queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
        void queryClient.invalidateQueries({ queryKey: BILLING_STATS_KEY })
        // A user's detail shows their subscriptions + MRR, so a grant/revoke moves it.
        void queryClient.invalidateQueries({ queryKey: ['adminUserDetail'] })
    }
}

/**
 * On-demand ISR trigger for the public landing. A catalog edit only reaches the
 * marketing pages' cached plan snapshot once we tell the server to drop it; this
 * fire-and-forget POST to the admin-gated revalidate route does that, so the change
 * shows publicly in ~ms instead of waiting out the time-based window. Best-effort:
 * if it fails, the time-based revalidate is the backstop.
 */
function revalidateLandingCatalog() {
    void fetch('/api/revalidate/plans', { method: 'POST' }).catch(() => undefined)
}

/** onSuccess for mutations that change what the public landing shows: invalidate the
 *  admin's own queries and revalidate the landing's cached catalog. */
function useCatalogChange() {
    const invalidate = useBillingInvalidator()

    return () => {
        invalidate()
        revalidateLandingCatalog()
    }
}

export function useAdminPlans(audience?: string) {
    return useQuery({
        queryKey: [...PLANS_KEY, audience ?? 'all'],
        queryFn: () => gqlRequest(AdminPlansDocument, { audience: audience ?? null }).then((r) => r.adminPlans),
        staleTime: 30_000,
    })
}

/**
 * The JSON Schema of an audience's entitlements — the plan form builds its fields
 * from it. It only changes when the API is redeployed, so it is cached hard.
 */
export function useEntitlementsSchema(audience: string) {
    return useQuery({
        queryKey: ['adminPlanEntitlementsSchema', audience],
        queryFn: () =>
            gqlRequest(AdminPlanEntitlementsSchemaDocument, { audience }).then(
                (r) => r.adminPlanEntitlementsSchema as EntitlementsJsonSchema,
            ),
        staleTime: Infinity,
    })
}

export function useAdminBillingStats() {
    return useQuery({
        queryKey: BILLING_STATS_KEY,
        queryFn: () => gqlRequest(AdminBillingStatsDocument).then((r) => r.adminBillingStats),
        staleTime: 60_000,
    })
}

export interface AdminSubscriptionFilters {
    status?: string
    gateway?: string
    planId?: string
    search?: string
}

export function useAdminSubscriptions(filters: AdminSubscriptionFilters = {}, offset = 0) {
    return useQuery({
        queryKey: [...SUBSCRIPTIONS_KEY, filters, offset],
        queryFn: () =>
            gqlRequest(AdminSubscriptionsDocument, {
                status: filters.status || null,
                gateway: filters.gateway || null,
                planId: filters.planId || null,
                search: filters.search?.trim() ? filters.search.trim() : null,
                limit: PAGE_SIZE,
                offset,
            }).then((r) => r.adminSubscriptions),
        placeholderData: keepPreviousData,
    })
}

/** One localized name/description for a non-default locale (e.g. `es`). */
export interface PlanTranslationInput {
    locale: string
    name: string
    description?: string | null
}

export interface CreatePlanInput {
    audience: string
    slug: string
    name: string
    description?: string | null
    entitlements: unknown
    status?: string
    isFree?: boolean
    sortOrder?: number
    translations?: PlanTranslationInput[]
}

export function useCreatePlan() {
    const onSuccess = useCatalogChange()

    return useMutation({
        mutationFn: (input: CreatePlanInput) => gqlRequest(CreatePlanDocument, { input }).then((r) => r.createPlan),
        onSuccess,
    })
}

export interface UpdatePlanInput {
    id: string
    name?: string
    description?: string | null
    entitlements?: unknown
    sortOrder?: number
    translations?: PlanTranslationInput[]
}

export function useUpdatePlan() {
    const onSuccess = useCatalogChange()

    return useMutation({
        mutationFn: (input: UpdatePlanInput) => gqlRequest(UpdatePlanDocument, { input }).then((r) => r.updatePlan),
        onSuccess,
    })
}

/**
 * Reorder an audience's plans — the order the landing shows them in. Takes the full
 * list of plan ids in the wanted order and persists it as contiguous `sortOrder`s.
 * Optimistic: the cards jump at once, and the success invalidation reconciles with
 * the server (and revalidates the landing's cached catalog).
 */
export function useReorderPlans(audience: string) {
    const queryClient = useQueryClient()
    const onSuccess = useCatalogChange()
    const key = [...PLANS_KEY, audience]

    return useMutation({
        mutationFn: (orderedIds: string[]) =>
            Promise.all(
                orderedIds.map((id, index) => gqlRequest(UpdatePlanDocument, { input: { id, sortOrder: index } })),
            ),
        onMutate: async (orderedIds: string[]) => {
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<AdminPlan[]>(key)

            if (previous) {
                const byId = new Map(previous.map((plan) => [plan.id, plan]))
                const next = orderedIds
                    .map((id, index) => {
                        const plan = byId.get(id)
                        return plan ? { ...plan, sortOrder: index } : null
                    })
                    .filter((plan): plan is AdminPlan => plan !== null)
                queryClient.setQueryData(key, next)
            }

            return { previous }
        },
        onError: (_error, _orderedIds, context) => {
            if (context?.previous) queryClient.setQueryData(key, context.previous)
        },
        onSuccess,
    })
}

export function useSetPlanStatus() {
    const onSuccess = useCatalogChange()

    return useMutation({
        mutationFn: (vars: { id: string; status: string }) =>
            gqlRequest(SetPlanStatusDocument, vars).then((r) => r.setPlanStatus),
        onSuccess,
    })
}

export function useAddPlanPrice() {
    const onSuccess = useCatalogChange()

    return useMutation({
        mutationFn: (input: { planId: string; interval: string; currency: string; amountCents: number }) =>
            gqlRequest(AddPlanPriceDocument, { input }).then((r) => r.addPlanPrice),
        onSuccess,
    })
}

export function useDeactivatePlanPrice() {
    const onSuccess = useCatalogChange()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeactivatePlanPriceDocument, { id }).then((r) => r.deactivatePlanPrice),
        onSuccess,
    })
}

export function useAssignSubscription() {
    const invalidate = useBillingInvalidator()

    return useMutation({
        mutationFn: (input: { userId: string; planId: string; until?: string | null }) =>
            gqlRequest(AdminAssignSubscriptionDocument, { input }).then((r) => r.adminAssignSubscription),
        onSuccess: invalidate,
    })
}

export function useRevokeSubscription() {
    const invalidate = useBillingInvalidator()

    return useMutation({
        mutationFn: (id: string) =>
            gqlRequest(AdminRevokeSubscriptionDocument, { id }).then((r) => r.adminRevokeSubscription),
        onSuccess: invalidate,
    })
}

// ── the shape of the entitlements schema the form renders ─────

/** One editable entitlement, as JSON Schema describes it. */
export interface EntitlementsJsonSchema {
    type: string
    properties: Record<string, EntitlementProperty>
    required?: string[]
}

export interface EntitlementProperty {
    /** `boolean` → a checkbox. A nullable integer (`anyOf`) → a number with an "unlimited" toggle. */
    type?: string
    anyOf?: { type: string }[]
    properties?: Record<string, EntitlementProperty>
    minimum?: number
}

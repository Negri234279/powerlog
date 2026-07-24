import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AdminBillingDriftQuery, AdminWebhookEventsQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AdminBillingDriftDocument,
    AdminGatewayStatusDocument,
    AdminWebhookEventsDocument,
    RetryWebhookEventDocument,
    SyncPlanToGatewayDocument,
} from '@/lib/graphql/operations/admin-billing-ops'

export type WebhookEvent = AdminWebhookEventsQuery['adminWebhookEvents']['rows'][number]
export type GatewayDrift = AdminBillingDriftQuery['adminBillingDrift'][number]

const WEBHOOKS_KEY = ['adminWebhookEvents']
const GATEWAYS_KEY = ['adminGatewayStatus']

export function useAdminGatewayStatus() {
    return useQuery({
        queryKey: GATEWAYS_KEY,
        queryFn: () => gqlRequest(AdminGatewayStatusDocument).then((r) => r.adminGatewayStatus),
        staleTime: 30_000,
    })
}

export interface WebhookEventFilters {
    statuses?: string[]
    gateways?: string[]
    type?: string
    eventId?: string
}

export function useAdminWebhookEvents(filters: WebhookEventFilters = {}) {
    const { statuses = [], gateways = [], type, eventId } = filters

    return useQuery({
        queryKey: [...WEBHOOKS_KEY, { statuses, gateways, type: type ?? '', eventId: eventId ?? '' }],
        queryFn: () =>
            gqlRequest(AdminWebhookEventsDocument, {
                statuses: statuses.length ? statuses : null,
                gateways: gateways.length ? gateways : null,
                type: type || null,
                eventId: eventId || null,
                limit: 50,
            }).then((r) => r.adminWebhookEvents),
    })
}

/**
 * The reconciliation, on demand. It calls out to the gateways, so it is only run
 * when asked — never on page load — and never cached.
 */
export function useCheckDrift() {
    return useMutation({
        mutationFn: () => gqlRequest(AdminBillingDriftDocument).then((r) => r.adminBillingDrift),
    })
}

export function useRetryWebhookEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(RetryWebhookEventDocument, { id }).then((r) => r.retryWebhookEvent),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: WEBHOOKS_KEY })
            void queryClient.invalidateQueries({ queryKey: GATEWAYS_KEY })
            void queryClient.invalidateQueries({ queryKey: ['adminBillingStats'] })
        },
    })
}

export function useSyncPlanToGateway() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (vars: { planId: string; gateway: string }) =>
            gqlRequest(SyncPlanToGatewayDocument, vars).then((r) => r.syncPlanToGateway),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['adminPlans'] })
            void queryClient.invalidateQueries({ queryKey: GATEWAYS_KEY })
        },
    })
}

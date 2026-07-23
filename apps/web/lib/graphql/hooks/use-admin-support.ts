import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    AdminSupportTicketQuery as AdminSupportTicketQ,
    AdminSupportTicketsQuery as AdminSupportTicketsQ,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AdminSupportTicketDocument,
    AdminSupportTicketsDocument,
    SetTicketStatusDocument,
} from '@/lib/graphql/operations/support'

export type SupportTicketRow = AdminSupportTicketsQ['adminSupportTickets']['rows'][number]
export type SupportTicketDetail = NonNullable<AdminSupportTicketQ['adminSupportTicket']>
export type SupportMessage = SupportTicketDetail['messages'][number]

const TICKETS_KEY = ['adminSupportTickets']

export function useAdminSupportTickets(filter: { statuses?: string[]; categories?: string[]; search?: string }) {
    return useQuery({
        queryKey: [
            ...TICKETS_KEY,
            filter.statuses?.join(',') ?? '',
            filter.categories?.join(',') ?? '',
            filter.search ?? '',
        ],
        queryFn: () =>
            gqlRequest(AdminSupportTicketsDocument, {
                statuses: filter.statuses?.length ? filter.statuses : null,
                categories: filter.categories?.length ? filter.categories : null,
                search: filter.search || null,
                limit: 50,
            }).then((r) => r.adminSupportTickets),
    })
}

export function useAdminSupportTicket(id: string) {
    return useQuery({
        queryKey: ['adminSupportTicket', id],
        queryFn: () => gqlRequest(AdminSupportTicketDocument, { id }).then((r) => r.adminSupportTicket),
    })
}

export function useSetTicketStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (vars: { id: string; status: string }) =>
            gqlRequest(SetTicketStatusDocument, vars).then((r) => r.setTicketStatus),
        onSuccess: (_data, vars) => {
            void queryClient.invalidateQueries({ queryKey: TICKETS_KEY })
            void queryClient.invalidateQueries({ queryKey: ['adminSupportTicket', vars.id] })
        },
    })
}

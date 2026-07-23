import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
const PAGE_SIZE = 30

/** Filterable support inbox, offset-paginated for infinite scroll. */
export function useAdminSupportTickets(filter: { statuses?: string[]; categories?: string[]; search?: string }) {
    return useInfiniteQuery({
        queryKey: [...TICKETS_KEY, filter],
        queryFn: ({ pageParam }) =>
            gqlRequest(AdminSupportTicketsDocument, {
                statuses: filter.statuses?.length ? filter.statuses : null,
                categories: filter.categories?.length ? filter.categories : null,
                search: filter.search?.trim() ? filter.search.trim() : null,
                limit: PAGE_SIZE,
                offset: pageParam,
            }).then((r) => r.adminSupportTickets),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const next = lastPage.offset + lastPage.rows.length
            return next < lastPage.total ? next : undefined
        },
        placeholderData: keepPreviousData,
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

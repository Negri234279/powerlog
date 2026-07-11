import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MyAthletesQuery, PendingInvitationsQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AcceptInvitationDocument,
    BecomeCoachDocument,
    DeclineInvitationDocument,
    InviteAthleteDocument,
    MyAthletesDocument,
    MyCoachesDocument,
    PendingInvitationsDocument,
} from '@/lib/graphql/operations/coaching'

export type CoachUser = MyAthletesQuery['myAthletes'][number]
export type PendingInvitation = PendingInvitationsQuery['pendingInvitations'][number]

const ATHLETES_KEY = ['coaching', 'athletes'] as const
const COACHES_KEY = ['coaching', 'coaches'] as const
const PENDING_KEY = ['coaching', 'pendingInvitations'] as const

/** Athletes linked to the caller (coaches only — the API gates it by role). */
export function useMyAthletes(enabled = true) {
    return useQuery({
        queryKey: ATHLETES_KEY,
        queryFn: async () => (await gqlRequest(MyAthletesDocument)).myAthletes,
        enabled,
        retry: false,
    })
}

/** Coaches linked to the caller. */
export function useMyCoaches() {
    return useQuery({
        queryKey: COACHES_KEY,
        queryFn: async () => (await gqlRequest(MyCoachesDocument)).myCoaches,
        retry: false,
    })
}

/** Coach invitations the caller has received and not yet answered. */
export function usePendingInvitations() {
    return useQuery({
        queryKey: PENDING_KEY,
        queryFn: async () => (await gqlRequest(PendingInvitationsDocument)).pendingInvitations,
        retry: false,
    })
}

/** Promote the caller to coach. The API re-issues the session cookie with the new
 *  role, so `me` (and server-side gating) reflect it immediately after refetch. */
export function useBecomeCoach() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: () => gqlRequest(BecomeCoachDocument),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['me'] })
            void qc.invalidateQueries({ queryKey: ATHLETES_KEY })
        },
    })
}

export function useInviteAthlete() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (username: string) => gqlRequest(InviteAthleteDocument, { username }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ATHLETES_KEY })
        },
    })
}

export function useAcceptInvitation() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(AcceptInvitationDocument, { id }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: PENDING_KEY })
            void qc.invalidateQueries({ queryKey: COACHES_KEY })
            void qc.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}

export function useDeclineInvitation() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeclineInvitationDocument, { id }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: PENDING_KEY })
            void qc.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}

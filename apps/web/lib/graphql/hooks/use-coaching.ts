import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    MyAthleteRosterQuery,
    MyAthletesQuery,
    PendingInvitationsQuery,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AcceptInvitationDocument,
    AthleteNoteDocument,
    BecomeCoachDocument,
    CoachInvitationPreviewDocument,
    DeclineInvitationDocument,
    InviteAthleteDocument,
    LeaveCoachDocument,
    MyAthleteDocument,
    MyAthleteRosterDocument,
    MyAthletesDocument,
    MyCoachesDocument,
    PendingInvitationsDocument,
    RemoveAthleteDocument,
    SetAthleteNoteDocument,
} from '@/lib/graphql/operations/coaching'

export type CoachUser = MyAthletesQuery['myAthletes'][number]
export type RosterEntry = MyAthleteRosterQuery['myAthleteRoster'][number]
export type PendingInvitation = PendingInvitationsQuery['pendingInvitations'][number]

const ATHLETES_KEY = ['coaching', 'athletes'] as const
const athleteKey = (athleteId: string) => ['coaching', 'athlete', athleteId] as const
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

/**
 * Training rollups for the whole roster, in one query. Kept separate from
 * `useMyAthletes` because identity and training live in different modules — the
 * two are merged by `athleteId` in the view, so identity can render before the
 * numbers arrive rather than waiting on them.
 */
export function useMyAthleteRoster(from?: string, enabled = true) {
    return useQuery({
        queryKey: [...ATHLETES_KEY, 'roster', from ?? 'all'],
        queryFn: async () => (await gqlRequest(MyAthleteRosterDocument, { from })).myAthleteRoster,
        enabled,
        retry: false,
    })
}

/**
 * One athlete linked to the caller, by id (coaches only). Resolves `null` when
 * they are not — a stale link, or an athlete who left — which the caller renders
 * as a not-found state. Prefer this over filtering `useMyAthletes()`: that one
 * can't tell "still loading the roster" apart from "not on it".
 */
export function useMyAthlete(athleteId: string) {
    return useQuery({
        queryKey: athleteKey(athleteId),
        queryFn: async () => (await gqlRequest(MyAthleteDocument, { athleteId })).myAthlete,
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

/** Public: preview a pending invitation from its opaque token (signup page). */
export function useCoachInvitationPreview(token: string | null) {
    return useQuery({
        queryKey: ['coaching', 'invitePreview', token],
        queryFn: async () =>
            (await gqlRequest(CoachInvitationPreviewDocument, { token: token ?? '' })).coachInvitationPreview,
        enabled: token !== null && token !== '',
        retry: false,
    })
}

const noteKey = (athleteId: string) => ['coaching', 'note', athleteId] as const

/** The coach's private note on one athlete (coaches only). */
export function useAthleteNote(athleteId: string, enabled = true) {
    return useQuery({
        queryKey: noteKey(athleteId),
        queryFn: async () => (await gqlRequest(AthleteNoteDocument, { athleteId })).athleteNote,
        enabled,
        retry: false,
    })
}

export function useSetAthleteNote(athleteId: string) {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (body: string) => gqlRequest(SetAthleteNoteDocument, { athleteId, body }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: noteKey(athleteId) })
        },
    })
}

export function useInviteAthlete() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (email: string) => gqlRequest(InviteAthleteDocument, { email }),
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

/** Stop coaching an athlete. They keep what was planned; the coach loses access. */
export function useRemoveAthlete() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (athleteId: string) => gqlRequest(RemoveAthleteDocument, { athleteId }),
        onSuccess: (_data, athleteId) => {
            void qc.invalidateQueries({ queryKey: ATHLETES_KEY })
            void qc.invalidateQueries({ queryKey: athleteKey(athleteId) })
            void qc.invalidateQueries({ queryKey: ['athlete', athleteId] })
        },
    })
}

/** Leave one of your coaches. You keep everything they planned for you. */
export function useLeaveCoach() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (coachId: string) => gqlRequest(LeaveCoachDocument, { coachId }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: COACHES_KEY })
        },
    })
}

'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

import { useMyAthlete } from '@/lib/graphql/hooks/use-coaching'
import { SessionEditor } from '@/components/workouts/session-editor'

/**
 * A session the coach programs *for one of their athletes*. Same editor as the
 * athlete's own (`/workouts/[id]`) — the API authorizes the coach on the very
 * same queries and mutations — but nested under the athlete so "back" returns to
 * that athlete instead of dumping the coach into their own training log.
 */
export default function AthleteSessionPage() {
    const t = useTranslations('coaching')
    const params = useParams<{ id: string; sessionId: string }>()
    const athleteId = params.id
    const queryClient = useQueryClient()

    // Everything the coach reads about this athlete (their history, summary,
    // blocks) is cached and, at 30s stale time, wouldn't reflect what was just
    // edited here. Refresh it on the way out.
    useEffect(() => {
        return () => {
            void queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] })
        }
    }, [athleteId, queryClient])

    // Already cached from the athlete detail header; falls back to a generic label.
    const { data: athlete } = useMyAthlete(athleteId)

    return (
        <SessionEditor
            sessionId={params.sessionId}
            back={{
                href: `/coaching/athletes/${athleteId}`,
                label: athlete ? `← @${athlete.username}` : t('backToAthlete'),
                analyticsId: 'session-breadcrumb-athlete',
            }}
        />
    )
}

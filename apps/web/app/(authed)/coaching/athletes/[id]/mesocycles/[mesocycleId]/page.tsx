'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

import { useMyAthletes } from '@/lib/graphql/hooks/use-coaching'
import { MesocycleOverview } from '@/components/workouts/mesocycle-overview'

/**
 * A training block the coach manages *for one of their athletes*. Same overview
 * as the athlete's own — the API decides who may edit it — but nested under the
 * athlete so "back" returns there instead of the coach's own block library.
 */
export default function AthleteMesocyclePage() {
    const t = useTranslations('coaching')
    const params = useParams<{ id: string; mesocycleId: string }>()
    const athleteId = params.id
    const queryClient = useQueryClient()

    // Generating a week creates sessions in the athlete's log; refresh what the
    // coach has cached about them on the way out.
    useEffect(() => {
        return () => {
            void queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] })
        }
    }, [athleteId, queryClient])

    const { data: athletes } = useMyAthletes()
    const athlete = athletes?.find((candidate) => candidate.userId === athleteId)

    return (
        <MesocycleOverview
            mesocycleId={params.mesocycleId}
            back={{
                href: `/coaching/athletes/${athleteId}`,
                label: athlete ? `← @${athlete.username}` : t('backToAthlete'),
                analyticsId: 'mesocycle-breadcrumb-athlete',
            }}
        />
    )
}

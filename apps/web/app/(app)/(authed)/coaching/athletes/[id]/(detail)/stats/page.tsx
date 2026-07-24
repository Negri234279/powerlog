'use client'

import { useParams } from 'next/navigation'

import { useMe } from '@/lib/graphql/hooks/use-auth'
import { unitsOf } from '@/lib/units'
import { AthleteStats } from '@/components/coaching/athlete-stats'

/** The athlete's KPIs and per-exercise breakdown, in the coach's units. */
export default function AthleteStatsPage() {
    const { id } = useParams<{ id: string }>()
    const { data: me } = useMe()

    return <AthleteStats athleteId={id} units={unitsOf(me?.units)} />
}

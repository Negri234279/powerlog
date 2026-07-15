'use client'

import { useParams, useRouter } from 'next/navigation'

import { MesocycleBuilder } from '@/components/workouts/mesocycle-builder'

/**
 * The coach building a training block **for one of their athletes**: the athlete
 * owns it, the coach plans (and edits) it. Same builder as their own blocks —
 * passing `athleteId` is what saves through `createAthleteMesocycle` and, in the
 * AI panel, anchors the design on the ATHLETE's strength instead of the coach's.
 */
export default function NewAthleteMesocyclePage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const athleteId = params.id

    const backToAthlete = () => router.push(`/coaching/athletes/${athleteId}`)

    return <MesocycleBuilder mesocycleId={null} athleteId={athleteId} onClose={backToAthlete} onSaved={backToAthlete} />
}

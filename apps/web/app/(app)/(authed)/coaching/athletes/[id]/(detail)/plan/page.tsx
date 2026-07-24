'use client'

import { useParams } from 'next/navigation'

import { AthletePlan } from '@/components/coaching/athlete-plan'

/** Everything the coach can put on the athlete's calendar. */
export default function AthletePlanPage() {
    const { id } = useParams<{ id: string }>()

    return <AthletePlan athleteId={id} />
}

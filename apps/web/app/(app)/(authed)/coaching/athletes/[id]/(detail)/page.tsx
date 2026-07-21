'use client'

import { useParams } from 'next/navigation'

import { useMe } from '@/lib/graphql/hooks/use-auth'
import { unitsOf } from '@/lib/units'
import { AthleteTraining } from '@/components/coaching/athlete-training'
import { Skeleton } from '@/components/ui/skeleton'

/** The athlete's sessions — the index section, so `/coaching/athletes/<id>`
 *  keeps opening on what it always opened on. */
export default function AthleteTrainingPage() {
    const { id } = useParams<{ id: string }>()
    const { data: me } = useMe()

    // `coachId` decides which sessions the coach may edit, so render nothing
    // rather than guessing while `me` resolves. The layout already proved the
    // viewer is a coach; this is only waiting for the profile.
    if (!me) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
                ))}
            </div>
        )
    }

    return <AthleteTraining athleteId={id} coachId={me.id} units={unitsOf(me.units)} />
}

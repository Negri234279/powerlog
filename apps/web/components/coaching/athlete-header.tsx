'use client'

import { useTranslations } from 'next-intl'

import { useMyAthlete } from '@/lib/graphql/hooks/use-coaching'
import { AthleteActions } from '@/components/coaching/athlete-actions'
import { Skeleton } from '@/components/ui/skeleton'

/** Identity block for the athlete detail area, with the actions on the right. */
export function AthleteHeader({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const { data: athlete, isPending } = useMyAthlete(athleteId)

    if (isPending) {
        return (
            <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-8 w-40 rounded-lg" />
            </div>
        )
    }

    // The API answered `null`: not your athlete — a stale link, or someone who
    // left. Say so instead of leaving the header stuck on a placeholder forever.
    if (!athlete) {
        return (
            <div>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('athlete')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('athleteNotFoundTitle')}</h1>
                <p className="mt-2 text-sm text-text-dim">{t('athleteNotFoundBody')}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-lg uppercase text-text ring-1 ring-hairline">
                    {athlete.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={athlete.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                        athlete.username.slice(0, 2)
                    )}
                </span>
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('athlete')}</p>
                    <h1 className="font-display text-h2 tracking-tight">{`@${athlete.username}`}</h1>
                </div>
            </div>

            <AthleteActions athleteId={athleteId} username={athlete.username} />
        </div>
    )
}

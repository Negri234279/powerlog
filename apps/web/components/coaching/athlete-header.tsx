'use client'

import { useTranslations } from 'next-intl'

import { useMyAthlete } from '@/lib/graphql/hooks/use-coaching'
import { fullName, initials } from '@/lib/user-name'
import { AthleteActions } from '@/components/coaching/athlete-actions'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Identity block for the athlete detail area, with the actions on the right.
 *
 * There is no "ATHLETE" eyebrow above the name on purpose. It sat in the most
 * valuable line on the page — directly under a link reading "back to coaching",
 * on a coach-only route, above a nav of athlete sections — to restate a fact
 * stated three times already, and it was styled identically to that back link,
 * so the two stacked micro-caps lines read as one caption and neither looked
 * clickable. The slot now carries the athlete's real name instead: the coach
 * clicked "Ana Ruiz" in the list, so landing on a page titled "@aruiz23" made
 * the identity *less* specific after navigating into it. Handle drops to the
 * quiet second line, which is also the shape the list rows use.
 */
export function AthleteHeader({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const { data: athlete, isPending } = useMyAthlete(athleteId)

    // Mirrors the resolved layout — circle, two text lines, actions on the right
    // — so nothing jumps or pops in when the query lands.
    //
    // The `sr-only` h1 is not decoration: `Skeleton` is `aria-hidden`, so without
    // it this branch is an empty region to a screen reader and the page has no
    // heading at all until the query resolves. The name can't come from the
    // server render — `myAthlete` needs the session, and `gqlServerRequest` is
    // credential-free by design — so the heading exists from the first paint with
    // a loading name, and `aria-busy` says why it isn't the athlete's yet.
    if (isPending) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-4" aria-busy>
                <h1 className="sr-only">{t('athleteLoading')}</h1>

                <div className="flex items-center gap-4">
                    <Skeleton className="size-14 shrink-0 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-44 rounded-lg" />
                        <Skeleton className="h-4 w-28 rounded" />
                    </div>
                </div>

                <Skeleton className="h-10 w-64 rounded-full" />
            </div>
        )
    }

    // The API answered `null`: not your athlete — a stale link, or someone who
    // left. Say so instead of leaving the header stuck on a placeholder forever.
    if (!athlete) {
        return (
            <div>
                <h1 className="font-display text-h2 tracking-tight">{t('athleteNotFoundTitle')}</h1>
                <p className="mt-2 text-sm text-text-dim">{t('athleteNotFoundBody')}</p>
            </div>
        )
    }

    const name = fullName(athlete)
    const handle = `@${athlete.username}`

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-lg uppercase text-text ring-1 ring-hairline">
                    {athlete.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={athlete.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                        initials(athlete)
                    )}
                </span>

                {/* Without a real name the handle is the title, so it is never
                    repeated on both lines. */}
                <div className="min-w-0">
                    <h1 className="truncate font-display text-h2 tracking-tight">{name ?? handle}</h1>
                    {name ? <p className="mt-0.5 truncate font-mono text-sm text-text-faint">{handle}</p> : null}
                </div>
            </div>

            <AthleteActions athleteId={athleteId} username={athlete.username} />
        </div>
    )
}

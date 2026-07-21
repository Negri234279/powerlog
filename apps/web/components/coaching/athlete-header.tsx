'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMyAthlete, useRemoveAthlete } from '@/lib/graphql/hooks/use-coaching'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton } from '@/components/ui/tracked'

/** Identity block for the athlete detail area, plus the link-severing action. */
export function AthleteHeader({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const router = useRouter()
    const errorMessage = useErrorMessage()

    const { data: athlete, isPending } = useMyAthlete(athleteId)

    const remove = useRemoveAthlete()
    const [confirming, setConfirming] = useState(false)
    const [removeError, setRemoveError] = useState<string | null>(null)

    function onRemove() {
        setRemoveError(null)
        remove.mutate(athleteId, {
            onSuccess: () => router.push('/coaching'),
            onError: (error) => setRemoveError(errorMessage(error)),
        })
    }

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
        <>
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

                <TrackedButton
                    analyticsId="athlete-remove-open"
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                >
                    {t('removeAthlete')}
                </TrackedButton>
            </div>

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={onRemove}
                title={t('removeAthleteTitle')}
                description={t('removeAthleteBody', { athlete: athlete.username })}
                confirmLabel={t('removeAthlete')}
                cancelLabel={t('cancel')}
                destructive
                pending={remove.isPending}
                error={removeError}
                analyticsId="athlete-remove"
            />
        </>
    )
}

'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useRemoveAthlete } from '@/lib/graphql/hooks/use-coaching'
import { PlanSessionModal } from '@/components/coaching/plan-session-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Dumbbell, Plus } from '@/components/ui/icons'
import { Menu } from '@/components/ui/menu'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/**
 * What the coach can do to this athlete, from any section of the detail shell.
 *
 * The two things they came to do — put a session on a day, start a block — are
 * one click from anywhere, so noticing something in Training doesn't cost a trip
 * through Plan to act on it. Severing the link is not one of those things: it is
 * irreversible and rare, so it moves into the overflow, where it stops being the
 * most prominent affordance on a page about programming.
 */
export function AthleteActions({ athleteId, username }: { athleteId: string; username: string }) {
    const t = useTranslations('coaching')
    const router = useRouter()
    const errorMessage = useErrorMessage()

    const remove = useRemoveAthlete()
    const [planning, setPlanning] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [removeError, setRemoveError] = useState<string | null>(null)

    function onRemove() {
        setRemoveError(null)
        remove.mutate(athleteId, {
            onSuccess: () => router.push('/coaching'),
            onError: (error) => setRemoveError(errorMessage(error)),
        })
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <TrackedButton
                    analyticsId="athlete-quick-session"
                    type="button"
                    onClick={() => setPlanning(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-4 py-2 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    <Plus className="size-4" /> {t('quickPlanSession')}
                </TrackedButton>

                <TrackedLink
                    analyticsId="athlete-quick-block"
                    href={`/coaching/athletes/${athleteId}/mesocycles/new`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                >
                    <Dumbbell className="size-4" /> {t('buildBlockFor')}
                </TrackedLink>

                <Menu
                    analyticsId="athlete-menu"
                    label={t('athleteMenu')}
                    items={[
                        {
                            label: t('removeAthlete'),
                            onSelect: () => setConfirming(true),
                            destructive: true,
                            analyticsId: 'athlete-remove-open',
                        },
                    ]}
                />
            </div>

            <PlanSessionModal athleteId={athleteId} open={planning} onClose={() => setPlanning(false)} />

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={onRemove}
                title={t('removeAthleteTitle')}
                description={t('removeAthleteBody', { athlete: username })}
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

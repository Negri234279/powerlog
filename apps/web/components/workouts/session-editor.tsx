'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    useCompleteWorkoutSession,
    useDeleteWorkoutSession,
    useExercises,
    useWorkoutSession,
} from '@/lib/graphql/hooks/use-workouts'
import { unitsOf } from '@/lib/units'
import { AddExercise } from '@/components/workouts/add-exercise'
import { AiPlanPanel } from '@/components/workouts/ai-plan-panel'
import { ExerciseEntry } from '@/components/workouts/exercise-entry'
import { SessionProgress } from '@/components/workouts/session-progress'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import type { BackLink } from '@/components/workouts/back-link'

function formatDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/**
 * The session view/editor: complete, delete, plan with AI, log sets. Shared by
 * `/workouts/[id]` and `/coaching/athletes/[id]/workouts/[sessionId]` so a coach
 * programming for an athlete never gets bounced into their own training log.
 */
export function SessionEditor({ sessionId, back }: { sessionId: string; back: BackLink }) {
    const t = useTranslations('workouts')
    const tc = useTranslations('common.status')
    const locale = useLocale()
    const errorMessage = useErrorMessage()
    const router = useRouter()
    const { data: me } = useMe()
    const units = unitsOf(me?.units)

    const { data: session, isLoading, isError } = useWorkoutSession(sessionId)
    const { data: exercises } = useExercises()
    const complete = useCompleteWorkoutSession()
    const del = useDeleteWorkoutSession()
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)
        return map
    }, [exercises])

    async function onComplete() {
        setActionError(null)
        try {
            await complete.mutateAsync(sessionId)
            track('session_completed', {})
        } catch (error) {
            setActionError(errorMessage(error))
        }
    }

    async function onDelete() {
        setActionError(null)
        try {
            await del.mutateAsync(sessionId)
            router.push(back.href)
        } catch (error) {
            setActionError(errorMessage(error))
        }
    }

    if (isLoading) {
        return <p className="text-body text-text-dim">{t('loadingSession')}</p>
    }

    if (isError || !session) {
        return (
            <div className="max-w-2xl">
                <p className="text-body text-ember">{t('loadError')}</p>
                <TrackedLink
                    analyticsId={back.analyticsId}
                    href={back.href}
                    className="mt-4 inline-block text-sm text-text underline-offset-4 hover:underline"
                >
                    {back.label}
                </TrackedLink>
            </div>
        )
    }

    const completed = session.status === 'completed'
    const coachPlanned = session.plannedByUserId !== null && session.plannedByUserId !== session.userId
    // Someone else's session ⇒ a coach is programming for that athlete. Everything
    // showing past performance has to read the ATHLETE's history, not the coach's.
    const athleteId = me && session.userId !== me.id ? session.userId : undefined

    return (
        <div>
            <TrackedLink
                analyticsId={back.analyticsId}
                href={back.href}
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {back.label}
            </TrackedLink>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display text-display">{formatDate(session.performedAt, locale)}</h1>
                        {coachPlanned ? (
                            <span className="rounded-full bg-amber/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber">
                                {t('coachPlanned')}
                            </span>
                        ) : null}
                    </div>
                    {session.notes ? <p className="mt-2 max-w-lg text-body text-text-dim">{session.notes}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                    {completed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pr/10 px-3 py-1.5 font-mono text-eyebrow uppercase text-pr">
                            <Check className="size-3.5" /> {tc('completed')}
                        </span>
                    ) : (
                        <TrackedButton
                            analyticsId="session-complete"
                            type="button"
                            onClick={onComplete}
                            disabled={complete.isPending}
                            className="inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-4 py-2 text-sm font-medium text-pr ring-1 ring-pr/30 transition-colors duration-300 hover:bg-pr/25 disabled:opacity-60"
                        >
                            <Check className="size-4" />
                            {complete.isPending ? t('completing') : t('complete')}
                        </TrackedButton>
                    )}

                    {confirmingDelete ? (
                        <span className="flex items-center gap-2">
                            <TrackedButton
                                analyticsId="session-delete-confirm-inline"
                                type="button"
                                onClick={onDelete}
                                disabled={del.isPending}
                                className="rounded-full bg-ember/15 px-3.5 py-2 text-sm font-medium text-ember ring-1 ring-ember/30 transition-colors duration-300 hover:bg-ember/25 disabled:opacity-60"
                            >
                                {del.isPending ? t('deleting') : t('deleteQ')}
                            </TrackedButton>
                            <TrackedButton
                                analyticsId="session-delete-cancel-inline"
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                className="rounded-full px-3 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                            >
                                {t('cancel')}
                            </TrackedButton>
                        </span>
                    ) : (
                        <TrackedButton
                            analyticsId="session-delete-open"
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            {t('delete')}
                        </TrackedButton>
                    )}
                </div>
            </div>

            <FormError error={actionError} className="mt-4" />

            <div className="mt-6 max-w-xl">
                <SessionProgress session={session} />
            </div>

            {/* Only a planned session has targets left to program. */}
            {completed ? null : (
                <div className="mt-8">
                    <AiPlanPanel sessionId={session.id} entries={session.entries} nameById={nameById} units={units} />
                </div>
            )}

            <div className="mt-10 space-y-4">
                {session.entries.length > 0 ? (
                    session.entries.map((entry) => (
                        <ExerciseEntry
                            key={entry.id}
                            sessionId={session.id}
                            entry={entry}
                            exerciseName={nameById.get(entry.exerciseId) ?? t('exercise')}
                            units={units}
                            athleteId={athleteId}
                        />
                    ))
                ) : (
                    <p className="text-body text-text-dim">{t('noExercisesYet')}</p>
                )}

                <div className="pt-2">
                    <AddExercise sessionId={session.id} />
                </div>
            </div>
        </div>
    )
}

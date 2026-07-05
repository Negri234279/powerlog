'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    useCompleteWorkoutSession,
    useDeleteWorkoutSession,
    useExercises,
    useWorkoutSession,
} from '@/lib/graphql/hooks/use-workouts'
import { unitsOf } from '@/lib/units'
import { AddExercise } from '@/components/workouts/add-exercise'
import { ExerciseEntry } from '@/components/workouts/exercise-entry'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export default function WorkoutSessionPage() {
    const params = useParams<{ id: string }>()
    const id = params.id
    const router = useRouter()
    const { data: me } = useMe()
    const units = unitsOf(me?.units)

    const { data: session, isLoading, isError } = useWorkoutSession(id)
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
            await complete.mutateAsync(id)
            track('session_completed', {})
        } catch (error) {
            setActionError(gqlErrorMessage(error))
        }
    }

    async function onDelete() {
        setActionError(null)
        try {
            await del.mutateAsync(id)
            router.push('/workouts')
        } catch (error) {
            setActionError(gqlErrorMessage(error))
        }
    }

    if (isLoading) {
        return <p className="text-body text-text-dim">Loading session…</p>
    }

    if (isError || !session) {
        return (
            <div className="max-w-2xl">
                <p className="text-body text-ember">Couldn&rsquo;t load this session.</p>
                <TrackedLink
                    analyticsId="session-back-to-workouts"
                    href="/workouts"
                    className="mt-4 inline-block text-sm text-text underline-offset-4 hover:underline"
                >
                    ← Back to workouts
                </TrackedLink>
            </div>
        )
    }

    const completed = session.status === 'completed'
    const coachPlanned = session.plannedByUserId !== null && session.plannedByUserId !== session.userId

    return (
        <div>
            <TrackedLink
                analyticsId="session-breadcrumb-workouts"
                href="/workouts"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                ← Workouts
            </TrackedLink>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-display text-display">{formatDate(session.performedAt)}</h1>
                        {coachPlanned ? (
                            <span className="rounded-full bg-amber/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber">
                                Coach-planned
                            </span>
                        ) : null}
                    </div>
                    {session.notes ? <p className="mt-2 max-w-lg text-body text-text-dim">{session.notes}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                    {completed ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pr/10 px-3 py-1.5 font-mono text-eyebrow uppercase text-pr">
                            <Check className="size-3.5" /> Completed
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
                            {complete.isPending ? 'Completing…' : 'Complete'}
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
                                {del.isPending ? 'Deleting…' : 'Delete?'}
                            </TrackedButton>
                            <TrackedButton
                                analyticsId="session-delete-cancel-inline"
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                className="rounded-full px-3 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                            >
                                Cancel
                            </TrackedButton>
                        </span>
                    ) : (
                        <TrackedButton
                            analyticsId="session-delete-open"
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            Delete
                        </TrackedButton>
                    )}
                </div>
            </div>

            <FormError error={actionError} className="mt-4" />

            <div className="mt-10 space-y-4">
                {session.entries.length > 0 ? (
                    session.entries.map((entry) => (
                        <ExerciseEntry
                            key={entry.id}
                            sessionId={session.id}
                            entry={entry}
                            exerciseName={nameById.get(entry.exerciseId) ?? 'Exercise'}
                            units={units}
                        />
                    ))
                ) : (
                    <p className="text-body text-text-dim">No exercises yet. Add one to start logging sets.</p>
                )}

                <div className="pt-2">
                    <AddExercise sessionId={session.id} />
                </div>
            </div>
        </div>
    )
}

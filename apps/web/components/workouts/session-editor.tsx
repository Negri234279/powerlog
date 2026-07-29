'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    useCompleteWorkoutSession,
    useDeleteWorkoutSession,
    useExercises,
    useWorkoutSession,
} from '@/lib/graphql/hooks/use-workouts'
import { formatSessionDate } from '@/lib/format-date'
import { unitsOf } from '@/lib/units'
import { AddExercise } from '@/components/workouts/add-exercise'
import { AiPlanPanel } from '@/components/workouts/ai-plan-panel'
import { ExerciseEntry } from '@/components/workouts/exercise-entry'
import { SessionProgress, entryProgress, sessionProgress } from '@/components/workouts/session-progress'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { Check, Lock, Pencil } from '@/components/ui/icons'
import { MultiSelect } from '@/components/ui/multi-select'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import type { BackLink } from '@/components/workouts/back-link'

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
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    // Whether the AI plan panel is showing its full-width card. When it is, the
    // status filter drops below it on narrow screens instead of being squeezed
    // against the card's edge.
    const [aiExpanded, setAiExpanded] = useState(false)
    // A completed session opens read-only; unlocking is a deliberate, confirmed
    // step so a stray tap while training can't rewrite what already happened.
    const [unlocked, setUnlocked] = useState(false)
    const [confirmingUnlock, setConfirmingUnlock] = useState(false)
    const [confirmingComplete, setConfirmingComplete] = useState(false)

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)
        return map
    }, [exercises])

    const statusOptions = useMemo(
        () => [
            { value: 'pending', label: t('statusPending') },
            { value: 'completed', label: t('statusCompleted') },
        ],
        [t],
    )

    // Nothing picked = no filter, the same as every other filter in the app.
    // An exercise counts as completed once every set in it has been marked.
    const visibleEntries = useMemo(() => {
        const entries = session?.entries ?? []
        if (statusFilter.length === 0) return entries

        return entries.filter((entry) => statusFilter.includes(entryProgress(entry).done ? 'completed' : 'pending'))
    }, [session, statusFilter])

    async function onComplete() {
        setConfirmingComplete(false)
        setActionError(null)
        try {
            await complete.mutateAsync(sessionId)
            track('session_completed', {})
        } catch (error) {
            setActionError(errorMessage(error))
        }
    }

    // Every set marked (e.g. 10/10) ⇒ complete straight away. Anything left
    // pending is likely an early tap, so make finishing it a deliberate confirm.
    function handleComplete() {
        if (!session) return
        if (sessionProgress(session).done) {
            void onComplete()
            return
        }

        setConfirmingComplete(true)
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
    const progress = sessionProgress(session)
    const locked = completed && !unlocked
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
                        <h1 className="font-display text-display">{formatSessionDate(session.performedAt, locale)}</h1>
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
                            onClick={handleComplete}
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

            {completed ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-shell px-5 py-4 ring-1 ring-hairline">
                    <div className="flex items-start gap-3">
                        {locked ? (
                            <Lock className="mt-0.5 size-4 shrink-0 text-text-faint" />
                        ) : (
                            <Pencil className="mt-0.5 size-4 shrink-0 text-amber" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-text">
                                {locked ? t('completedLockedTitle') : t('editingCompletedTitle')}
                            </p>
                            <p className="mt-0.5 text-sm text-text-dim">
                                {locked ? t('completedLockedBody') : t('editingCompletedBody')}
                            </p>
                        </div>
                    </div>
                    {locked ? (
                        <TrackedButton
                            analyticsId="session-unlock-open"
                            type="button"
                            onClick={() => setConfirmingUnlock(true)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            <Pencil className="size-4" /> {t('editSession')}
                        </TrackedButton>
                    ) : (
                        <TrackedButton
                            analyticsId="session-relock"
                            type="button"
                            onClick={() => setUnlocked(false)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            <Lock className="size-4" /> {t('lockSession')}
                        </TrackedButton>
                    )}
                </div>
            ) : null}

            <div className="mt-6">
                <SessionProgress session={session} />
            </div>

            {/* `items-start` + a growing AI slot so this row holds up in both of the
                panel's shapes: a pill next to the filter when closed, and a
                full-width card when open. Once the card is open, the row stacks on
                narrow screens so the status filter drops below it instead of
                squeezing the card — it stays at the card's top-right from `sm` up. */}
            <div className={cn('mt-8 flex items-start gap-3', aiExpanded ? 'flex-col sm:flex-row' : 'flex-wrap')}>
                <div className={cn('min-w-0', aiExpanded ? 'w-full sm:flex-1' : 'flex-1')}>
                    {/* Only a planned session has targets left to program. */}
                    {completed ? null : (
                        <AiPlanPanel
                            sessionId={session.id}
                            entries={session.entries}
                            nameById={nameById}
                            units={units}
                            onExpandedChange={setAiExpanded}
                        />
                    )}
                </div>

                {session.entries.length > 0 ? (
                    <div className={cn(aiExpanded ? 'w-full sm:w-auto sm:shrink-0' : 'shrink-0')}>
                        <MultiSelect
                            analyticsId="session-entries-filter-status"
                            label={t('filterStatus')}
                            options={statusOptions}
                            selected={statusFilter}
                            onChange={setStatusFilter}
                        />
                    </div>
                ) : null}
            </div>

            <div className="mt-10 space-y-4">
                {session.entries.length === 0 ? (
                    <p className="text-body text-text-dim">{t('noExercisesYet')}</p>
                ) : visibleEntries.length === 0 ? (
                    <p className="text-body text-text-dim">{t('noMatchingExercises')}</p>
                ) : (
                    visibleEntries.map((entry) => (
                        <ExerciseEntry
                            key={entry.id}
                            sessionId={session.id}
                            entry={entry}
                            exerciseName={nameById.get(entry.exerciseId) ?? t('exercise')}
                            units={units}
                            athleteId={athleteId}
                            locked={locked}
                        />
                    ))
                )}

                {locked ? null : (
                    <div className="pt-2">
                        <AddExercise sessionId={session.id} />
                    </div>
                )}
            </div>

            <ConfirmModal
                analyticsId="session-complete-confirm"
                open={confirmingComplete}
                onClose={() => setConfirmingComplete(false)}
                onConfirm={() => void onComplete()}
                title={t('completeConfirmTitle')}
                description={t('completeConfirmBody', { completed: progress.completed, total: progress.total })}
                confirmLabel={t('complete')}
                cancelLabel={t('cancel')}
                pending={complete.isPending}
            />

            <ConfirmModal
                analyticsId="session-unlock"
                open={confirmingUnlock}
                onClose={() => setConfirmingUnlock(false)}
                onConfirm={() => {
                    setUnlocked(true)
                    setConfirmingUnlock(false)
                }}
                title={t('unlockConfirmTitle')}
                description={t('unlockConfirmBody')}
                confirmLabel={t('unlockConfirm')}
                cancelLabel={t('cancel')}
            />
        </div>
    )
}

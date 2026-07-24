'use client'

import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { draftTitle } from '@/lib/ai/draft-title'
import { formatSessionDate } from '@/lib/format-date'
import { gqlRequest } from '@/lib/graphql/client'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useForkAiDraft, useOpenDraftFor } from '@/lib/graphql/hooks/use-ai-history'
import { useExercises, useWorkoutSession } from '@/lib/graphql/hooks/use-workouts'
import { AiDraftDetailDocument } from '@/lib/graphql/operations/ai-history'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { unitsOf } from '@/lib/units'
import { UpgradeGate, isPlanRefusal } from '@/components/billing/upgrade-gate'
import { FormError } from '@/components/ui/form-error'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { ProposedWeek } from '@/components/workouts/mesocycle-ai-shared'
import { AiConversationThread } from './ai-conversation-thread'
import { AiDraftKindChip, AiDraftStatusChip } from './ai-draft-chips'
import { ForkConflictModal } from './fork-conflict-modal'
import { groupByEntry, ProposedSets } from './proposed-sets'

/**
 * One past conversation: the proposal it produced, and the thread that produced
 * it. **Read-only** — refining, accepting and discarding stay in the panels that
 * own a live draft, because two screens that can accept the same draft is how a
 * double-accept bug ships. Continuing is a navigation, not an edit.
 */
export function AiDraftDetail({ draftId }: { draftId: string }) {
    const t = useTranslations('aiHistory')
    const td = useTranslations('aiHistory.detail')
    const tu = useTranslations('aiHistory.untitled')
    const locale = useLocale()
    const errorMessage = useErrorMessage()
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)

    const { data: me } = useMe()
    const units = unitsOf(me?.units)

    const detail = useQuery({
        queryKey: ['aiDraftDetail', draftId],
        queryFn: () => gqlRequest(AiDraftDetailDocument, { draftId }),
    })

    const plan = detail.data?.planDraftById ?? null
    const mesocycle = detail.data?.mesocycleDraftById ?? null

    // The session names the lifts a plan draft programs, and whether it still
    // exists decides if "view session" is a link or a note.
    const session = useWorkoutSession(plan?.sessionId ?? '')
    const exercises = useExercises()

    // Where continuing lands: the panel that owns a live draft of this kind. A
    // coach's block is built on the athlete's route, not the personal one.
    const panelHref = plan
        ? (`/workouts/${plan.sessionId}` as const)
        : mesocycle?.athleteId
          ? (`/coaching/athletes/${mesocycle.athleteId}/mesocycles/new` as const)
          : ('/workouts/mesocycles' as const)

    // Is something already open on the same target? Only asked for a resolved
    // draft — an open one is not forked, it is resumed.
    const openDraft = useOpenDraftFor(
        plan
            ? { kind: 'session', sessionId: plan.sessionId }
            : { kind: 'mesocycle', athleteId: mesocycle?.athleteId ?? 'self' },
        Boolean(plan ?? mesocycle) && (plan ?? mesocycle)?.status !== 'open',
    )
    const fork = useForkAiDraft()

    function continueConversation() {
        fork.mutate(
            { id: (plan ?? mesocycle)!.id, kind: plan ? 'session' : 'mesocycle' },
            {
                onSuccess: () => {
                    setConfirming(false)
                    router.push(panelHref)
                },
            },
        )
    }

    function onContinue() {
        // Warn only when there is something to lose. With nothing open the fork
        // runs straight away — an interstitial that always says "are you sure"
        // teaches people to click through it.
        if (openDraft.data) setConfirming(true)
        else continueConversation()
    }

    if (detail.isPending) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        )
    }

    if (detail.isError) {
        return (
            <QueryError
                message={errorMessage(detail.error)}
                onRetry={() => detail.refetch()}
                analyticsId="ai-draft-retry"
            />
        )
    }

    // Both null: it never existed, or it isn't the caller's. The two are
    // deliberately indistinguishable here.
    if (!plan && !mesocycle) {
        return (
            <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                    <h2 className="font-display text-h3">{td('notFoundTitle')}</h2>
                    <p className="mt-2 max-w-md text-body text-text-dim">{td('notFoundBody')}</p>
                    <TrackedLink
                        analyticsId="ai-draft-back-not-found"
                        href="/workouts/ai"
                        className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        {td('backToHistory')}
                    </TrackedLink>
                </div>
            </div>
        )
    }

    const draft = plan ?? mesocycle!
    const kind = plan ? 'session' : 'mesocycle'
    const title = draftTitle({
        title: firstRequest(draft.messages),
        name: mesocycle?.name ?? null,
        kind,
    })

    const nameById = new Map((exercises.data ?? []).map((exercise) => [exercise.id, exercise.name]))
    const entryNames = new Map(
        (session.data?.entries ?? []).map((entry) => [entry.id, nameById.get(entry.exerciseId) ?? '']),
    )

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <AiDraftStatusChip status={draft.status} />
                <AiDraftKindChip kind={kind} />
            </div>

            <h1 className="mt-3 font-display text-h2 tracking-tight">
                {title.kind === 'none' ? (
                    <span className="text-text-dim">{tu(title.of)}</span>
                ) : title.kind === 'request' ? (
                    `“${title.text}”`
                ) : (
                    title.text
                )}
            </h1>

            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                {draft.provider} · {draft.model} ·{' '}
                <time dateTime={draft.createdAt}>{formatSessionDate(draft.createdAt, locale)}</time>
            </p>

            {/* Where the proposal ended up, when it went somewhere. A mesocycle
                draft only learns its block once the builder created one. */}
            {plan && draft.status === 'accepted' ? (
                session.data ? (
                    <TrackedLink
                        analyticsId="ai-draft-view-target"
                        href={`/workouts/${plan.sessionId}`}
                        className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        {td('viewSession')}
                    </TrackedLink>
                ) : (
                    <p className="mt-4 text-sm text-text-faint">{td('sessionGone')}</p>
                )
            ) : null}

            {mesocycle?.mesocycleId ? (
                <TrackedLink
                    analyticsId="ai-draft-view-target"
                    href={`/workouts/mesocycles/${mesocycle.mesocycleId}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    {td('viewMesocycle')}
                </TrackedLink>
            ) : null}

            <div className="mt-6">
                {draft.status === 'open' ? (
                    // A live draft is not continued, it is resumed — and it is
                    // accepted in the panel, never here: two screens that can
                    // accept the same draft is how a double-accept ships.
                    <TrackedLink
                        analyticsId="ai-draft-resume"
                        href={panelHref}
                        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04]"
                    >
                        {td('resume')}
                    </TrackedLink>
                ) : (
                    <TrackedButton
                        analyticsId="ai-draft-fork"
                        type="button"
                        onClick={onContinue}
                        disabled={fork.isPending}
                        className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    >
                        {fork.isPending ? td('continuing') : td('continueInNewDraft')}
                    </TrackedButton>
                )}

                {/* A downgrade outlives the history, so this is reachable. */}
                {isPlanRefusal(fork.error) ? (
                    <div className="mt-4">
                        <UpgradeGate error={fork.error} />
                    </div>
                ) : (
                    <FormError error={fork.error ? errorMessage(fork.error) : null} className="mt-3" />
                )}
            </div>

            <ForkConflictModal
                open={confirming}
                blocking={openDraft.data ?? null}
                pending={fork.isPending}
                error={fork.error && !isPlanRefusal(fork.error) ? errorMessage(fork.error) : null}
                onClose={() => setConfirming(false)}
                onGoToOpen={() => router.push(panelHref)}
                onConfirm={continueConversation}
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-12">
                {/* Proposal first: on a phone the question is "what did it tell me
                    to lift", not "what was said about it". */}
                <section className="lg:col-span-7">
                    <h2 className="font-mono text-eyebrow uppercase text-text-faint">{td('proposal')}</h2>
                    <div className="mt-3 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                        <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                            {mesocycle ? (
                                <>
                                    <p className="mb-3 text-sm font-medium text-text">
                                        {td('weeks', { count: mesocycle.weeks })}
                                    </p>
                                    <ProposedWeek draft={mesocycle} units={units} locale={locale} nameById={nameById} />
                                </>
                            ) : (
                                <ProposedSets
                                    entries={groupByEntry(
                                        plan!.sets,
                                        (session.data?.entries ?? []).map((entry) => entry.id),
                                        entryNames,
                                    )}
                                    units={units}
                                />
                            )}

                            {draft.status !== 'open' ? (
                                <p className="mt-5 border-t border-hairline pt-4 text-sm text-text-faint">
                                    {/* Stated, not merely implied by absent buttons. */}
                                    {td(draft.status === 'accepted' ? 'readOnlyAccepted' : 'readOnlyDiscarded')}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section className="lg:col-span-5">
                    <h2 className="font-mono text-eyebrow uppercase text-text-faint">
                        {t('messages', { count: draft.messages.length })}
                    </h2>
                    <div className="mt-3 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                        <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                            <AiConversationThread messages={draft.messages} model={draft.model} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

/** The athlete's opening words, when they wrote any — the draft's title. */
function firstRequest(messages: readonly { role: string; content: string }[]): string | null {
    return messages.find((message) => message.role === 'user')?.content ?? null
}

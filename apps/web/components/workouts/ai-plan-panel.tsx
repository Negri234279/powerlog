'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { FormError } from '@/components/ui/form-error'
import { UpgradeGate, isPlanRefusal } from '@/components/billing/upgrade-gate'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Bolt } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { kgTo, type Units } from '@/lib/units'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import {
    type AiPlanDraft,
    type GeneratePlanVariables,
    useAcceptPlanDraft,
    useDiscardPlanDraft,
    useGenerateSessionPlanDraft,
    useRefinePlanDraft,
    useSessionPlanDraft,
} from '@/lib/graphql/hooks/use-ai-plan'
import type { WorkoutSessionData } from '@/lib/graphql/hooks/use-workouts'

type Entries = NonNullable<WorkoutSessionData>['entries']
type ProposedSet = AiPlanDraft['sets'][number]

/** "102.5kg × 5 @8" / "90kg × 8 · RIR 2" — the same shape as a logged set. */
function formatTarget(set: ProposedSet, units: Units): string {
    const weight = set.plannedWeightKg === null ? '—' : `${Number(kgTo(units, set.plannedWeightKg).toFixed(1))}${units}`
    const base = `${weight} × ${set.plannedReps ?? '—'}`
    if (set.rpe !== null) return `${base} @${set.rpe}`
    if (set.rir !== null) return `${base} · RIR ${set.rir}`

    return base
}

/**
 * The AI's proposal for a planned session: what it would program for each set,
 * why, and a box to argue with it.
 *
 * The targets shown here have not touched the session. Accepting writes them —
 * and they remain editable afterwards like any other planned set, which is why
 * this panel reviews rather than edits.
 */
export function AiPlanPanel({
    sessionId,
    entries,
    nameById,
    units,
}: {
    sessionId: string
    entries: Entries
    nameById: Map<string, string>
    units: Units
}) {
    const t = useTranslations('aiPlan')
    const errorMessage = useErrorMessage()

    // Any exercise is programmable now — the model proposes the set scheme, so
    // an entry without sets is exactly the case the feature is for.
    const hasEntries = entries.length > 0
    const { data: draft, isLoading } = useSessionPlanDraft(sessionId, hasEntries)

    const generate = useGenerateSessionPlanDraft(sessionId)
    const refine = useRefinePlanDraft(sessionId)
    const accept = useAcceptPlanDraft(sessionId)
    const discard = useDiscardPlanDraft(sessionId)

    const [error, setError] = useState<string | null>(null)
    // The raw error too: only it carries the `extensions.code` that tells a plan
    // refusal ("you don't pay for AI") from a real failure. One gets an upgrade CTA,
    // the other an error message.
    const [rawError, setRawError] = useState<unknown>(null)
    const [extraInfo, setExtraInfo] = useState('')
    const [open, setOpen] = useState(false)

    /** Every exercise of the session, for the per-exercise generate buttons. */
    const programmable = useMemo(
        () => entries.map((entry) => ({ id: entry.id, name: nameById.get(entry.exerciseId) ?? '' })),
        [entries, nameById],
    )

    // The proposal is grouped per exercise entry; the session names the lift.
    const proposalByEntry = useMemo(() => {
        const byEntry = new Map<string, ProposedSet[]>()
        for (const set of draft?.sets ?? []) {
            const list = byEntry.get(set.entryId) ?? []
            list.push(set)
            byEntry.set(set.entryId, list)
        }

        return entries
            .filter((entry) => byEntry.has(entry.id))
            .map((entry) => ({
                entryId: entry.id,
                name: nameById.get(entry.exerciseId) ?? '',
                sets: byEntry
                    .get(entry.id)!
                    .slice()
                    .sort((a, b) => a.order - b.order),
            }))
    }, [draft, entries, nameById])

    async function run(action: () => Promise<unknown>, onDone?: () => void) {
        setError(null)
        setRawError(null)
        try {
            await action()
            onDone?.()
        } catch (caught) {
            setError(errorMessage(caught))
            setRawError(caught)
        }
    }

    const onGenerate = (variables: GeneratePlanVariables = {}) =>
        run(
            () => generate.mutateAsync({ extraInfo: extraInfo.trim() || null, ...variables }),
            () => {
                track('ai_plan_generated', { scope: variables.entryId ? 'exercise' : 'session' })
                setExtraInfo('')
            },
        )

    const onAccept = () => {
        if (!draft) return
        void run(
            () => accept.mutateAsync(draft.id),
            () => track('ai_plan_accepted', {}),
        )
    }

    const onDiscard = () => {
        if (!draft) return
        void run(
            () => discard.mutateAsync(draft.id),
            () => track('ai_plan_discarded', {}),
        )
    }

    async function onRefine(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!draft) return
        const form = event.currentTarget
        const message = String(new FormData(form).get('message') ?? '').trim()
        if (message === '') return

        await run(
            () => refine.mutateAsync({ draftId: draft.id, message }),
            () => {
                track('ai_plan_refined', {})
                form.reset()
            },
        )
    }

    if (!hasEntries || isLoading) return null

    const busy = generate.isPending || refine.isPending || accept.isPending || discard.isPending

    // Collapsed by default: the panel only needs to be a nudge until the athlete
    // wants it. A live draft always expands — there's a proposal to review.
    if (!open && !draft) {
        return (
            <TrackedButton
                analyticsId="ai-plan-open"
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
            >
                <Bolt className="size-4" /> {t('open')}
            </TrackedButton>
        )
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                        <h2 className="mt-3 font-display text-h3 text-text">{t('title')}</h2>
                        <p className="mt-3 max-w-lg text-body text-text-dim">{draft ? t('draftBody') : t('body')}</p>
                    </div>

                    {draft ? (
                        <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1 font-mono text-eyebrow uppercase text-text-dim">
                            {draft.model}
                        </span>
                    ) : null}
                </div>

                {draft ? (
                    <div className="mt-6 space-y-6">
                        <div className="space-y-4">
                            {proposalByEntry.map((entry) => (
                                <div key={entry.entryId}>
                                    <p className="font-mono text-eyebrow uppercase text-text-dim">{entry.name}</p>
                                    <ul className="mt-2 space-y-1">
                                        {entry.sets.map((proposed) => (
                                            <li
                                                key={proposed.order}
                                                className="flex flex-wrap items-baseline gap-x-3 text-sm text-text"
                                            >
                                                <span className="font-mono text-text-faint">{proposed.order}</span>
                                                <span>{formatTarget(proposed, units)}</span>
                                                {proposed.notes ? (
                                                    <span className="text-text-dim">— {proposed.notes}</span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                            {draft.messages.map((message) => (
                                <p
                                    key={message.id}
                                    className={message.role === 'user' ? 'text-sm text-text' : 'text-sm text-text-dim'}
                                >
                                    {message.role === 'user' ? `“${message.content}”` : message.content}
                                </p>
                            ))}

                            <form onSubmit={onRefine} className="flex gap-2 pt-1">
                                <Input
                                    name="message"
                                    placeholder={t('refinePlaceholder')}
                                    maxLength={1000}
                                    disabled={busy}
                                    aria-label={t('refineAria')}
                                />
                                <TrackedButton
                                    analyticsId="ai-plan-refine"
                                    type="submit"
                                    disabled={busy}
                                    className="shrink-0 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                                >
                                    {refine.isPending ? t('refining') : t('refine')}
                                </TrackedButton>
                            </form>
                        </div>

                        {isPlanRefusal(rawError) ? <UpgradeGate error={rawError} /> : <FormError error={error} />}

                        <div className="flex flex-wrap items-center gap-3">
                            <TrackedButton
                                analyticsId="ai-plan-accept"
                                type="button"
                                onClick={onAccept}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-4 py-2 text-sm font-medium text-pr ring-1 ring-pr/30 transition-colors duration-300 hover:bg-pr/25 disabled:opacity-60"
                            >
                                {accept.isPending ? t('accepting') : t('accept')}
                            </TrackedButton>

                            <TrackedButton
                                analyticsId="ai-plan-regenerate"
                                type="button"
                                // Regenerating keeps the draft's scope: a proposal for
                                // one exercise stays about that exercise.
                                onClick={() => void onGenerate({ entryId: draft.entryId })}
                                disabled={busy}
                                className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                            >
                                {generate.isPending ? t('generating') : t('regenerate')}
                            </TrackedButton>

                            <TrackedButton
                                analyticsId="ai-plan-discard"
                                type="button"
                                onClick={onDiscard}
                                disabled={busy}
                                className="rounded-full px-4 py-2 text-sm text-ember transition-colors duration-300 hover:text-ember/80 disabled:opacity-50"
                            >
                                {t('discard')}
                            </TrackedButton>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        <div className="max-w-lg">
                            <Field label={t('extraInfo')} htmlFor="ai-plan-extra" hint={t('extraInfoHint')}>
                                <Textarea
                                    id="ai-plan-extra"
                                    value={extraInfo}
                                    onChange={(event) => setExtraInfo(event.target.value)}
                                    maxLength={1000}
                                    placeholder={t('extraInfoPlaceholder')}
                                    disabled={busy}
                                />
                            </Field>
                        </div>

                        {isPlanRefusal(rawError) ? <UpgradeGate error={rawError} /> : <FormError error={error} />}

                        <div className="flex flex-wrap items-center gap-3">
                            <TrackedButton
                                analyticsId="ai-plan-generate"
                                type="button"
                                onClick={() => void onGenerate()}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                            >
                                <Bolt className="size-4" />
                                {generate.isPending ? t('generating') : t('generate')}
                            </TrackedButton>
                            <TrackedButton
                                analyticsId="ai-plan-close"
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={busy}
                                className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                            >
                                {t('close')}
                            </TrackedButton>
                        </div>

                        {/* One exercise at a time: the same job on a smaller scope. */}
                        {programmable.length > 1 ? (
                            <div>
                                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('orOneExercise')}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {programmable.map((entry) => (
                                        <TrackedButton
                                            key={entry.id}
                                            analyticsId="ai-plan-generate-exercise"
                                            type="button"
                                            onClick={() => void onGenerate({ entryId: entry.id })}
                                            disabled={busy}
                                            className="rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-50"
                                        >
                                            {entry.name}
                                        </TrackedButton>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    )
}

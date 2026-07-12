'use client'

import { useLocale, useTranslations } from 'next-intl'
import { type FormEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import {
    type AiMesocycleDraft,
    useAcceptMesocycleDraft,
    useDiscardMesocycleDraft,
    useGenerateMesocycleDraft,
    useMesocycleDraft,
    useRefineMesocycleDraft,
} from '@/lib/graphql/hooks/use-ai-mesocycle'
import type { Units } from '@/lib/units'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Bolt } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { DayToggles, ProposedWeek } from './mesocycle-ai-shared'

/**
 * Asks the model to design a training block, and hands the result to the builder.
 *
 * The week shown here is a **template**: the builder repeats it across the block's
 * weeks and the athlete edits everything before anything is saved. Taking the
 * proposal writes nothing — `createMesocycle` still does that.
 *
 * `weeks` and `trainingDays` are chosen here rather than described in the prompt,
 * and the API validates them before the model is ever called: free text can argue
 * about which exercises go in a week, never about the shape of the block.
 */
export function MesocycleAiPanel({
    units,
    nameById,
    onApply,
    athleteId,
}: {
    units: Units
    /** Localized catalog names. The draft carries the canonical English one. */
    nameById: Map<string, string>
    onApply: (draft: AiMesocycleDraft) => void
    /** Set when a coach designs for one of their athletes: the model is then given
     *  the ATHLETE's strength, and the draft is filed (and cached) under them. */
    athleteId?: string
}) {
    const t = useTranslations('aiMesocycle')
    const locale = useLocale()
    const errorMessage = useErrorMessage()

    const { data: draft, isLoading } = useMesocycleDraft(true, athleteId)
    const generate = useGenerateMesocycleDraft()
    const refine = useRefineMesocycleDraft(athleteId)
    const accept = useAcceptMesocycleDraft(athleteId)
    const discard = useDiscardMesocycleDraft(athleteId)

    const [weeks, setWeeks] = useState(4)
    const [trainingDays, setTrainingDays] = useState<number[]>([0, 2, 4])
    const [goal, setGoal] = useState('')
    const [prompt, setPrompt] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [open, setOpen] = useState(false)

    const busy = generate.isPending || refine.isPending || accept.isPending || discard.isPending

    async function run(action: () => Promise<unknown>, onDone?: () => void) {
        setError(null)
        try {
            await action()
            onDone?.()
        } catch (caught) {
            setError(errorMessage(caught))
        }
    }

    function toggleDay(offset: number) {
        setTrainingDays((days) =>
            days.includes(offset) ? days.filter((day) => day !== offset) : [...days, offset].sort((a, b) => a - b),
        )
    }

    const onGenerate = () => {
        if (trainingDays.length === 0) {
            setError(t('pickADay'))
            return
        }

        void run(
            () =>
                generate.mutateAsync({
                    weeks,
                    trainingDays,
                    goal: goal.trim() || null,
                    prompt: prompt.trim() || null,
                    athleteId,
                }),
            () => track('ai_mesocycle_generated', { weeks: String(weeks), days: String(trainingDays.length) }),
        )
    }

    const onAccept = () => {
        if (!draft) return
        void run(
            () => accept.mutateAsync(draft.id),
            () => {
                track('ai_mesocycle_accepted', {})
                // Hand the proposal over *before* the panel folds away: the cache
                // entry is cleared on accept, so `draft` is about to become null.
                onApply(draft)
                setOpen(false)
            },
        )
    }

    const onDiscard = () => {
        if (!draft) return
        void run(
            () => discard.mutateAsync(draft.id),
            () => track('ai_mesocycle_discarded', {}),
        )
    }

    async function onRefine(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!draft) return
        const form = event.currentTarget
        const message = String(new FormData(form).get('message') ?? '').trim()
        if (message === '') return

        await run(
            () => refine.mutateAsync({ draftId: draft.id, message }),
            () => {
                track('ai_mesocycle_refined', {})
                form.reset()
            },
        )
    }

    if (isLoading) return null

    // Collapsed by default: the builder is the primary way to make a mesocycle,
    // and an athlete without an AI provider configured should not be nagged.
    if (!open && !draft) {
        return (
            <div className="mt-4">
                <TrackedButton
                    analyticsId="ai-mesocycle-open"
                    type="button"
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                >
                    <Bolt className="size-4" /> {t('open')}
                </TrackedButton>
            </div>
        )
    }

    return (
        <div className="mt-4 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                        <h2 className="mt-2 font-display text-h3 text-text">{t('title')}</h2>
                        <p className="mt-2 max-w-lg text-body text-text-dim">{draft ? t('draftBody') : t('body')}</p>
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
                            <p className="text-sm text-text">
                                <span className="font-medium">{draft.name}</span>
                                <span className="text-text-dim"> · {t('weekCount', { weeks: draft.weeks })}</span>
                            </p>
                            <ProposedWeek draft={draft} units={units} locale={locale} nameById={nameById} />
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
                                    maxLength={500}
                                    disabled={busy}
                                    aria-label={t('refineAria')}
                                />
                                <TrackedButton
                                    analyticsId="ai-mesocycle-refine"
                                    type="submit"
                                    disabled={busy}
                                    className="shrink-0 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                                >
                                    {refine.isPending ? t('refining') : t('refine')}
                                </TrackedButton>
                            </form>
                            <p className="text-xs text-text-faint">{t('refineHint')}</p>
                        </div>

                        <FormError error={error} />

                        <div className="flex flex-wrap items-center gap-3">
                            <TrackedButton
                                analyticsId="ai-mesocycle-accept"
                                type="button"
                                onClick={onAccept}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-4 py-2 text-sm font-medium text-pr ring-1 ring-pr/30 transition-colors duration-300 hover:bg-pr/25 disabled:opacity-60"
                            >
                                {accept.isPending ? t('applying') : t('apply', { weeks: draft.weeks })}
                            </TrackedButton>

                            <TrackedButton
                                analyticsId="ai-mesocycle-discard"
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('weeks')} htmlFor="ai-meso-weeks">
                                <Input
                                    id="ai-meso-weeks"
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={52}
                                    value={weeks}
                                    onChange={(event) => setWeeks(Number(event.target.value))}
                                    disabled={busy}
                                />
                            </Field>
                            <Field label={t('goal')} htmlFor="ai-meso-goal">
                                <Input
                                    id="ai-meso-goal"
                                    value={goal}
                                    onChange={(event) => setGoal(event.target.value)}
                                    maxLength={60}
                                    placeholder={t('goalPlaceholder')}
                                    disabled={busy}
                                />
                            </Field>
                        </div>

                        <div>
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('trainingDays')}</p>
                            <DayToggles
                                selected={trainingDays}
                                onToggle={toggleDay}
                                disabled={busy}
                                locale={locale}
                                analyticsId="ai-mesocycle-toggle-day"
                            />
                        </div>

                        <Field label={t('prompt')} htmlFor="ai-meso-prompt" hint={t('promptHint')}>
                            <Textarea
                                id="ai-meso-prompt"
                                value={prompt}
                                onChange={(event) => setPrompt(event.target.value)}
                                maxLength={1000}
                                placeholder={t('promptPlaceholder')}
                                disabled={busy}
                            />
                        </Field>

                        <FormError error={error} />

                        <div className="flex flex-wrap items-center gap-3">
                            <TrackedButton
                                analyticsId="ai-mesocycle-generate"
                                type="button"
                                onClick={onGenerate}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                            >
                                <Bolt className="size-4" />
                                {generate.isPending ? t('generating') : t('generate')}
                            </TrackedButton>
                            <TrackedButton
                                analyticsId="ai-mesocycle-close"
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={busy}
                                className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                            >
                                {t('close')}
                            </TrackedButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

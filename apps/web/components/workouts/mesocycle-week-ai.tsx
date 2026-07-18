'use client'

import { useLocale, useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import {
    type AiMesocycleDraft,
    useAcceptMesocycleDraft,
    useDiscardMesocycleDraft,
    useGenerateMesocycleDraft,
    useRefineMesocycleDraft,
} from '@/lib/graphql/hooks/use-ai-mesocycle'
import type { Units } from '@/lib/units'
import { Field, Input, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Bolt } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { DayToggles, ProposedWeek } from './mesocycle-ai-shared'

/** Fallback days when the week is empty and there is nothing to infer from. */
const DEFAULT_DAYS = [0, 2, 4]

/**
 * Fills a single week of the builder with an AI-designed week. Unlike the block
 * panel, this holds its proposal in local state rather than the shared draft
 * query: the draft is not tied to a builder week on the server, so a per-week
 * flow that read the global draft would show the same proposal in every week.
 *
 * The whole conversation — generate, refine, apply — is scoped to one week
 * (`weeks: 1`), and applying replaces just this week's days. Nothing is written to
 * the mesocycle: the week lands in the builder, editable, and `createMesocycle`
 * (or the update mutation) still saves it.
 */
export function MesocycleWeekAiPanel({
    units,
    goal,
    currentDayOffsets,
    nameById,
    onApply,
    onClose,
}: {
    units: Units
    /** The mesocycle's goal, passed to the model as a fixed parameter. */
    goal: string
    /** Days the week already trains, pre-selecting the toggles. */
    currentDayOffsets: number[]
    nameById: Map<string, string>
    onApply: (draft: AiMesocycleDraft) => void
    onClose: () => void
}) {
    const t = useTranslations('aiMesocycle')
    const locale = useLocale()
    const errorMessage = useErrorMessage()

    const generate = useGenerateMesocycleDraft()
    const refine = useRefineMesocycleDraft()
    const accept = useAcceptMesocycleDraft()
    const discard = useDiscardMesocycleDraft()

    const [draft, setDraft] = useState<AiMesocycleDraft | null>(null)
    const [days, setDays] = useState<number[]>(currentDayOffsets.length > 0 ? currentDayOffsets : DEFAULT_DAYS)
    const [prompt, setPrompt] = useState('')
    const [error, setError] = useState<string | null>(null)

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
        setDays((current) =>
            current.includes(offset)
                ? current.filter((day) => day !== offset)
                : [...current, offset].sort((a, b) => a - b),
        )
    }

    const onGenerate = () => {
        if (days.length === 0) {
            setError(t('pickADay'))
            return
        }

        void run(
            async () => {
                // weeks: 1 — we take the single designed week and drop it into this
                // one builder week; there is no block to replicate across.
                const result = await generate.mutateAsync({
                    weeks: 1,
                    trainingDays: days,
                    goal: goal.trim() || null,
                    prompt: prompt.trim() || null,
                })
                setDraft(result)
            },
            () => track('ai_mesocycle_generated', { weeks: '1', days: String(days.length) }),
        )
    }

    async function onRefine(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!draft) return
        const form = event.currentTarget
        const message = String(new FormData(form).get('message') ?? '').trim()
        if (message === '') return

        await run(
            async () => {
                const result = await refine.mutateAsync({ draftId: draft.id, message })
                setDraft(result)
            },
            () => {
                track('ai_mesocycle_refined', {})
                form.reset()
            },
        )
    }

    const onUse = () => {
        if (!draft) return
        void run(
            async () => {
                // Hand the week to the builder first, then resolve the draft so a
                // failed accept doesn't lose a week the athlete has already taken.
                onApply(draft)
                await accept.mutateAsync(draft.id)
            },
            () => {
                track('ai_mesocycle_accepted', {})
                onClose()
            },
        )
    }

    const onDiscard = () => {
        void run(
            () => (draft ? discard.mutateAsync(draft.id) : Promise.resolve()),
            () => {
                if (draft) track('ai_mesocycle_discarded', {})
                onClose()
            },
        )
    }

    return (
        <div className="mt-4 rounded-xl bg-bg/40 p-4 ring-1 ring-hairline">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('weekEyebrow')}</p>
                    <p className="mt-1 max-w-md text-sm text-text-dim">{draft ? t('weekDraftBody') : t('weekBody')}</p>
                </div>
                {draft ? (
                    <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1 font-mono text-eyebrow uppercase text-text-dim">
                        {draft.model}
                    </span>
                ) : null}
            </div>

            {draft ? (
                <div className="mt-4 space-y-5">
                    <ProposedWeek draft={draft} units={units} locale={locale} nameById={nameById} />

                    <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-hairline">
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
                                analyticsId="ai-mesocycle-week-refine"
                                type="submit"
                                disabled={busy}
                                className="shrink-0 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                            >
                                {refine.isPending ? t('refining') : t('refine')}
                            </TrackedButton>
                        </form>
                    </div>

                    <FormError error={error} />

                    <div className="flex flex-wrap items-center gap-3">
                        <TrackedButton
                            analyticsId="ai-mesocycle-week-use"
                            type="button"
                            onClick={onUse}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full bg-pr/15 px-4 py-2 text-sm font-medium text-pr ring-1 ring-pr/30 transition-colors duration-300 hover:bg-pr/25 disabled:opacity-60"
                        >
                            {accept.isPending ? t('applying') : t('useWeek')}
                        </TrackedButton>
                        <TrackedButton
                            analyticsId="ai-mesocycle-week-discard"
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
                <div className="mt-4 space-y-4">
                    <div>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{t('trainingDays')}</p>
                        <DayToggles
                            selected={days}
                            onToggle={toggleDay}
                            disabled={busy}
                            locale={locale}
                            analyticsId="ai-mesocycle-week-toggle-day"
                        />
                    </div>

                    <Field label={t('prompt')} htmlFor="ai-meso-week-prompt" hint={t('promptHint')}>
                        <Textarea
                            id="ai-meso-week-prompt"
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
                            analyticsId="ai-mesocycle-week-generate"
                            type="button"
                            onClick={onGenerate}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                        >
                            <Bolt className="size-4" />
                            {generate.isPending ? t('generating') : t('generate')}
                        </TrackedButton>
                        <TrackedButton
                            analyticsId="ai-mesocycle-week-cancel"
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                        >
                            {t('close')}
                        </TrackedButton>
                    </div>
                </div>
            )}
        </div>
    )
}

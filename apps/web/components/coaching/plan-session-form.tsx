'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type SubmitEvent, useState } from 'react'

import { usePlanSessionFromTemplate, usePlanWorkoutSession } from '@/lib/graphql/hooks/use-athlete'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { isoAtNoon, todayLocalIso } from '@/lib/format-date'
import { type SelectedTemplate, TemplateBrowseModal, TemplateCombobox } from '@/components/workouts/template-select'
import { FormError } from '@/components/ui/form-error'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Plus } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * Plan a session for the athlete — blank, or materialized from one of the
 * coach's templates. Shared by the Plan section's card and the shell's quick
 * action, so the shortcut and the full surface can't drift apart.
 */
export function PlanSessionForm({ athleteId, analyticsId }: { athleteId: string; analyticsId: string }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const router = useRouter()

    const plan = usePlanWorkoutSession()
    const planFromTemplate = usePlanSessionFromTemplate()

    const [date, setDate] = useState(todayLocalIso())
    const [notes, setNotes] = useState('')
    const [template, setTemplate] = useState<SelectedTemplate | null>(null)
    const [browsing, setBrowsing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const pending = plan.isPending || planFromTemplate.isPending

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        const input = {
            athleteId,
            performedAt: isoAtNoon(date),
            notes: notes.trim() === '' ? undefined : notes.trim(),
        }
        // Straight into the session editor: that is where the coach builds the plan.
        // Under the athlete's route, not /workouts/<id> — that one belongs to the
        // coach's own log, and its "back" would strand them there.
        const onSuccess = (id: string) => router.push(`/coaching/athletes/${athleteId}/workouts/${id}`)
        const onError = (err: unknown) => setError(errorMessage(err))

        if (template) {
            planFromTemplate.mutate(
                { ...input, templateId: template.id },
                { onSuccess: (data) => onSuccess(data.planSessionFromTemplate.id), onError },
            )
            return
        }

        plan.mutate(input, { onSuccess: (data) => onSuccess(data.planWorkoutSession.id), onError })
    }

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('planDate')}>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </Field>
                    <Field label={t('planTemplate')}>
                        <TemplateCombobox value={template} onChange={setTemplate} onBrowse={() => setBrowsing(true)} />
                    </Field>
                </div>

                <Field label={t('planNotes')}>
                    <Textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('planNotesPlaceholder')}
                    />
                </Field>

                <FormError error={error} />

                <TrackedButton
                    analyticsId={analyticsId}
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    <Plus className="size-4" />
                    {pending ? t('planning') : template ? t('planFromTemplate') : t('planBlank')}
                </TrackedButton>
            </form>

            {browsing ? (
                <TemplateBrowseModal
                    open={browsing}
                    onClose={() => setBrowsing(false)}
                    onSelect={(selected) => {
                        setTemplate(selected)
                        setBrowsing(false)
                    }}
                />
            ) : null}
        </>
    )
}

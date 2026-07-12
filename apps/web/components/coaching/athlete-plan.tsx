'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'

import { useAssignMesocycle, usePlanSessionFromTemplate, usePlanWorkoutSession } from '@/lib/graphql/hooks/use-athlete'
import { useAthleteMesocycles } from '@/lib/graphql/hooks/use-athlete'
import { useMesocycles } from '@/lib/graphql/hooks/use-mesocycles'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type SelectedTemplate, TemplateBrowseModal, TemplateCombobox } from '@/components/workouts/template-select'
import { FormError } from '@/components/ui/form-error'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Calendar, Dumbbell, Plus } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/** Today as YYYY-MM-DD in the coach's timezone (for <input type="date">). */
function todayLocalIso(): string {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
}

/** A date input value → an ISO datetime at midday (matches how sessions are dated). */
function isoAtNoon(date: string): string {
    return new Date(`${date}T12:00:00`).toISOString()
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline">
            <h3 className="font-display text-lg tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-text-dim">{subtitle}</p>
            <div className="mt-4">{children}</div>
        </div>
    )
}

/** Plan a session for the athlete — blank, or materialized from one of the coach's templates. */
function PlanSessionCard({ athleteId }: { athleteId: string }) {
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

    function onSubmit(event: FormEvent<HTMLFormElement>) {
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
        <Card title={t('planSessionTitle')} subtitle={t('planSessionSubtitle')}>
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
                    analyticsId="athlete-plan-session"
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
        </Card>
    )
}

/** Copy one of the coach's own blocks into the athlete's library. */
function AssignBlockCard({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()

    const { data: mine } = useMesocycles()
    const assign = useAssignMesocycle()

    const [mesocycleId, setMesocycleId] = useState('')
    const [startDate, setStartDate] = useState(todayLocalIso())
    const [error, setError] = useState<string | null>(null)
    const [assigned, setAssigned] = useState<string | null>(null)

    // Blocks a coach already handed to someone are copies; only offer their own.
    const own = (mine ?? []).filter((mesocycle) => mesocycle.plannedByUserId === null)

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (mesocycleId === '') return

        setError(null)
        setAssigned(null)
        assign.mutate(
            { athleteId, mesocycleId, startDate },
            {
                onSuccess: (data) => {
                    setAssigned(data.assignMesocycleToAthlete.name)
                    setMesocycleId('')
                },
                onError: (err) => setError(errorMessage(err)),
            },
        )
    }

    if (own.length === 0) {
        return (
            <Card title={t('assignBlockTitle')} subtitle={t('assignBlockSubtitle')}>
                <p className="text-sm text-text-faint">{t('noBlocksYet')}</p>
                <TrackedLink
                    analyticsId="athlete-plan-build-block"
                    href="/workouts/mesocycles"
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    <Dumbbell className="size-4" /> {t('buildBlock')}
                </TrackedLink>
            </Card>
        )
    }

    return (
        <Card title={t('assignBlockTitle')} subtitle={t('assignBlockSubtitle')}>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('assignBlock')}>
                        <Select value={mesocycleId} onChange={(e) => setMesocycleId(e.target.value)}>
                            <option value="">{t('assignBlockPlaceholder')}</option>
                            {own.map((mesocycle) => (
                                <option key={mesocycle.id} value={mesocycle.id}>
                                    {mesocycle.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t('assignStartDate')}>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </Field>
                </div>

                {assigned ? <p className="text-sm text-pr">{t('assigned', { name: assigned })}</p> : null}
                <FormError error={error} />

                <TrackedButton
                    analyticsId="athlete-assign-block"
                    type="submit"
                    disabled={assign.isPending || mesocycleId === ''}
                    className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                >
                    <Calendar className="size-4" />
                    {assign.isPending ? t('assigning') : t('assign')}
                </TrackedButton>
            </form>
        </Card>
    )
}

/** The blocks this athlete already has, so the coach can jump into one. */
function AthleteBlocks({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const tm = useTranslations('mesocycles')
    const locale = useLocale()
    const { data: blocks } = useAthleteMesocycles(athleteId)

    if (!blocks || blocks.length === 0) return null

    return (
        <Card title={t('athleteBlocksTitle')} subtitle={t('athleteBlocksSubtitle')}>
            <div className="space-y-2">
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-hairline"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-text">{block.name}</p>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                {tm(`status.${block.status}`)} ·{' '}
                                {block.startDate
                                    ? new Date(block.startDate).toLocaleDateString(locale, {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : tm('noStartDate')}
                            </p>
                        </div>
                        <TrackedLink
                            analyticsId="athlete-block-open"
                            href={`/coaching/athletes/${athleteId}/mesocycles/${block.id}`}
                            className="shrink-0 rounded-full px-4 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            {t('openBlock')}
                        </TrackedLink>
                    </div>
                ))}
            </div>
        </Card>
    )
}

/** Everything the coach can put on the athlete's calendar. */
export function AthletePlan({ athleteId }: { athleteId: string }) {
    return (
        <div className="space-y-4">
            <PlanSessionCard athleteId={athleteId} />
            <AssignBlockCard athleteId={athleteId} />
            <AthleteBlocks athleteId={athleteId} />
        </div>
    )
}

'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import type { AiMesocycleDraft } from '@/lib/graphql/hooks/use-ai-mesocycle'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { type ExerciseData, useExercises } from '@/lib/graphql/hooks/use-workouts'
import {
    type MesocycleData,
    useCreateAthleteMesocycle,
    useCreateMesocycle,
    useMesocycle,
    useUpdateMesocycle,
} from '@/lib/graphql/hooks/use-mesocycles'
import {
    type WorkoutTemplateData,
    useWorkoutTemplate,
    useWorkoutTemplates,
} from '@/lib/graphql/hooks/use-workout-templates'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'
import { kgTo, type Units, unitsOf } from '@/lib/units'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Bolt, ChevronDown, Close, Plus, Trash } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { ExercisePicker } from './exercise-picker'
import { MesocycleAiPanel } from './mesocycle-ai-panel'
import { MesocycleWeekAiPanel } from './mesocycle-week-ai'

type IntensityKind = 'none' | 'rpe' | 'rir'

interface DraftSet {
    key: string
    weight: string
    reps: string
    intensityKind: IntensityKind
    intensity: string
    notes: string
}

interface DraftExercise {
    key: string
    exerciseId: string
    notes: string
    sets: DraftSet[]
}

interface DraftDay {
    key: string
    dayOffset: number
    label: string
    exercises: DraftExercise[]
}

interface DraftWeek {
    key: string
    label: string
    days: DraftDay[]
}

function newKey(): string {
    return crypto.randomUUID()
}

function emptySet(): DraftSet {
    return { key: newKey(), weight: '', reps: '', intensityKind: 'none', intensity: '', notes: '' }
}

function emptyDay(dayOffset: number): DraftDay {
    return { key: newKey(), dayOffset, label: '', exercises: [] }
}

function emptyWeek(): DraftWeek {
    return { key: newKey(), label: '', days: [emptyDay(0)] }
}

function numberOrNull(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
}

/** Round a display-unit value to a tidy 2-decimal string (drops float noise). */
function weightToInput(kg: number | null, units: Units): string {
    if (kg === null) return ''
    return String(Math.round(kgTo(units, kg) * 100) / 100)
}

/** A YYYY-MM-DD string (for <input type="date">) from an ISO datetime, or ''. */
function toDateInput(iso: string | null | undefined): string {
    if (!iso) return ''
    return iso.slice(0, 10)
}

/** Short weekday name for a 0–6 offset (0 = Monday), localized via Intl. */
function weekdayLabel(offset: number, locale: string): string {
    // 2024-01-01 is a Monday.
    const d = new Date(Date.UTC(2024, 0, 1 + offset))
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d)
}

/** Map a set's planned targets (kg) to an editable draft set (display units). */
function setToDraft(
    set: {
        plannedWeightKg: number | null
        plannedReps: number | null
        rpe: number | null
        rir: number | null
        notes: string | null
    },
    units: Units,
): DraftSet {
    return {
        key: newKey(),
        weight: weightToInput(set.plannedWeightKg, units),
        reps: set.plannedReps !== null ? String(set.plannedReps) : '',
        intensityKind: set.rpe !== null ? 'rpe' : set.rir !== null ? 'rir' : 'none',
        intensity: set.rpe !== null ? String(set.rpe) : set.rir !== null ? String(set.rir) : '',
        notes: set.notes ?? '',
    }
}

/** Build the editable draft tree from a loaded mesocycle (kg → display units). */
function draftFromMesocycle(mesocycle: MesocycleData, units: Units): DraftWeek[] {
    return mesocycle.microcycles.map((week) => ({
        key: newKey(),
        label: week.label ?? '',
        days: week.days.map((day) => ({
            key: newKey(),
            dayOffset: day.dayOffset,
            label: day.label ?? '',
            exercises: day.exercises.map((exercise) => ({
                key: newKey(),
                exerciseId: exercise.exerciseId,
                notes: exercise.notes ?? '',
                sets: exercise.sets.map((set) => setToDraft(set, units)),
            })),
        })),
    }))
}

/** Map a loaded template's exercises into draft exercises, for import-into-day. */
function templateToDraftExercises(template: WorkoutTemplateData, units: Units): DraftExercise[] {
    return template.exercises.map((exercise) => ({
        key: newKey(),
        exerciseId: exercise.exerciseId,
        notes: exercise.notes ?? '',
        sets: exercise.sets.map((set) => setToDraft(set, units)),
    }))
}

/**
 * One AI-designed week as editable draft days, with fresh keys on every call — so
 * replicating it across weeks never shares React identity between them.
 */
function daysFromAiProposal(proposal: AiMesocycleDraft, units: Units): DraftDay[] {
    return [...proposal.days]
        .sort((a, b) => a.dayOffset - b.dayOffset)
        .map((day) => ({
            key: newKey(),
            dayOffset: day.dayOffset,
            label: day.label ?? '',
            exercises: day.exercises.map((exercise) => ({
                key: newKey(),
                exerciseId: exercise.exerciseId,
                notes: exercise.notes ?? '',
                sets: exercise.sets.map((set) => setToDraft(set, units)),
            })),
        }))
}

/**
 * Turn an AI proposal into the editable draft tree. The model designs **one**
 * template week; it is repeated across the block's weeks here, in the client,
 * because that is where the athlete then edits each week's progression.
 */
function draftFromAiProposal(proposal: AiMesocycleDraft, units: Units): DraftWeek[] {
    return Array.from({ length: proposal.weeks }, () => ({
        key: newKey(),
        label: '',
        days: daysFromAiProposal(proposal, units),
    }))
}

/**
 * Create/edit a mesocycle as a whole tree: name + goal + start date + microcycles
 * (weeks) → days → programmed exercises/sets. Weights are entered in the user's
 * display unit and sent with `unit` so the API stores canonical kg. Progression is
 * manual, with a "duplicate week (+increment)" helper and per-day template import.
 */
export function MesocycleBuilder({
    mesocycleId,
    onClose,
    onSaved,
    athleteId,
}: {
    mesocycleId: string | null
    onClose: () => void
    onSaved: () => void
    /** Set when a coach builds the block FOR one of their athletes: the athlete
     *  owns it, the coach plans it, and the AI designs off the athlete's strength. */
    athleteId?: string
}) {
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const { data: exercises } = useExercises()
    const editing = mesocycleId !== null
    const { data: loaded, isLoading: loadingMesocycle } = useMesocycle(mesocycleId)

    const create = useCreateMesocycle()
    const createForAthlete = useCreateAthleteMesocycle(athleteId ?? '')
    const update = useUpdateMesocycle()
    const pending = create.isPending || createForAthlete.isPending || update.isPending

    const t = useTranslations('mesocycles')
    const tw = useTranslations('workouts')
    const locale = useLocale()
    const errorMessage = useErrorMessage()

    const [name, setName] = useState('')
    const [goal, setGoal] = useState('')
    const [startDate, setStartDate] = useState('')
    const [notes, setNotes] = useState('')
    const [weeks, setWeeks] = useState<DraftWeek[]>([emptyWeek()])
    const [error, setError] = useState<string | null>(null)
    // Which week (if any) has its AI fill panel open. One at a time: the server
    // holds a single open draft per user, so two panels would share one proposal.
    const [aiWeekKey, setAiWeekKey] = useState<string | null>(null)

    // Seed from the loaded mesocycle once (edit mode).
    const [seeded, setSeeded] = useState(false)
    useEffect(() => {
        if (editing && loaded && !seeded) {
            setName(loaded.name)
            setGoal(loaded.goal ?? '')
            setStartDate(toDateInput(loaded.startDate))
            setNotes(loaded.notes ?? '')
            setWeeks(draftFromMesocycle(loaded, units))
            setSeeded(true)
        }
    }, [editing, loaded, seeded, units])

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)
        return map
    }, [exercises])

    /**
     * Seed the builder from an AI proposal. It overwrites the tree, but only the
     * fields the model actually proposed: a name the athlete already typed, or a
     * start date they picked, is theirs to keep.
     */
    function applyAiProposal(proposal: AiMesocycleDraft) {
        setError(null)
        if (name.trim() === '') setName(proposal.name)
        if (goal.trim() === '' && proposal.goal) setGoal(proposal.goal)
        setWeeks(draftFromAiProposal(proposal, units))
    }

    /** Replace one week's days with an AI-designed week, keeping the week's label. */
    function fillWeekWithAi(weekKey: string, proposal: AiMesocycleDraft) {
        setWeeks((w) =>
            w.map((week) => (week.key === weekKey ? { ...week, days: daysFromAiProposal(proposal, units) } : week)),
        )
        setAiWeekKey(null)
    }

    function patchWeek(key: string, patch: Partial<DraftWeek>) {
        setWeeks((w) => w.map((week) => (week.key === key ? { ...week, ...patch } : week)))
    }

    function addWeek() {
        setWeeks((w) => [...w, emptyWeek()])
    }

    /** Clone the last week, applying an optional weight increment (display units). */
    function duplicateLastWeek(increment: number) {
        setWeeks((w) => {
            const last = w[w.length - 1]
            if (!last) return [emptyWeek()]
            const clone: DraftWeek = {
                key: newKey(),
                label: last.label,
                days: last.days.map((day) => ({
                    key: newKey(),
                    dayOffset: day.dayOffset,
                    label: day.label,
                    exercises: day.exercises.map((exercise) => ({
                        key: newKey(),
                        exerciseId: exercise.exerciseId,
                        notes: exercise.notes,
                        sets: exercise.sets.map((set) => {
                            const base = numberOrNull(set.weight)
                            const bumped =
                                base !== null && increment !== 0
                                    ? String(Math.round((base + increment) * 100) / 100)
                                    : set.weight
                            return { ...set, key: newKey(), weight: bumped }
                        }),
                    })),
                })),
            }
            return [...w, clone]
        })
    }

    function removeWeek(key: string) {
        setWeeks((w) => w.filter((week) => week.key !== key))
    }

    function patchDay(weekKey: string, dayKey: string, patch: Partial<DraftDay>) {
        setWeeks((w) =>
            w.map((week) =>
                week.key === weekKey
                    ? { ...week, days: week.days.map((day) => (day.key === dayKey ? { ...day, ...patch } : day)) }
                    : week,
            ),
        )
    }

    function addDay(weekKey: string) {
        setWeeks((w) =>
            w.map((week) => {
                if (week.key !== weekKey) return week
                // Next weekday after the last day (wrap within the week).
                const last = week.days[week.days.length - 1]
                const nextOffset = last ? Math.min(6, last.dayOffset + 1) : 0
                return { ...week, days: [...week.days, emptyDay(nextOffset)] }
            }),
        )
    }

    function removeDay(weekKey: string, dayKey: string) {
        setWeeks((w) =>
            w.map((week) =>
                week.key === weekKey ? { ...week, days: week.days.filter((day) => day.key !== dayKey) } : week,
            ),
        )
    }

    function setDayExercises(
        weekKey: string,
        dayKey: string,
        updater: (exercises: DraftExercise[]) => DraftExercise[],
    ) {
        setWeeks((w) =>
            w.map((week) =>
                week.key === weekKey
                    ? {
                          ...week,
                          days: week.days.map((day) =>
                              day.key === dayKey ? { ...day, exercises: updater(day.exercises) } : day,
                          ),
                      }
                    : week,
            ),
        )
    }

    async function onSave() {
        setError(null)
        if (name.trim() === '') {
            setError(t('nameRequired'))
            return
        }

        const input = {
            name: name.trim(),
            notes: notes.trim() === '' ? null : notes.trim(),
            goal: goal.trim() === '' ? null : goal.trim(),
            startDate: startDate === '' ? null : startDate,
            microcycles: weeks.map((week) => ({
                label: week.label.trim() === '' ? null : week.label.trim(),
                days: week.days.map((day) => ({
                    dayOffset: day.dayOffset,
                    label: day.label.trim() === '' ? null : day.label.trim(),
                    exercises: day.exercises.map((exercise) => ({
                        exerciseId: exercise.exerciseId,
                        notes: exercise.notes.trim() === '' ? null : exercise.notes.trim(),
                        sets: exercise.sets.map((set) => ({
                            unit: units,
                            plannedWeight: numberOrNull(set.weight),
                            plannedReps: numberOrNull(set.reps),
                            rpe: set.intensityKind === 'rpe' ? numberOrNull(set.intensity) : null,
                            rir: set.intensityKind === 'rir' ? numberOrNull(set.intensity) : null,
                            notes: set.notes.trim() === '' ? null : set.notes.trim(),
                        })),
                    })),
                })),
            })),
        }

        try {
            if (editing) {
                await update.mutateAsync({ id: mesocycleId, input })
                track('mesocycle_updated', {})
            } else if (athleteId) {
                await createForAthlete.mutateAsync(input)
                track('mesocycle_created', {})
            } else {
                await create.mutateAsync(input)
                track('mesocycle_created', {})
            }
            onSaved()
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    if (editing && loadingMesocycle && !seeded) {
        return <p className="text-body text-text-dim">{t('loadingMesocycle')}</p>
    }

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                    <h1 className="mt-1 font-display text-h2 tracking-tight">
                        {editing ? t('editTitle') : t('newMesocycle')}
                    </h1>
                </div>
                <TrackedButton
                    analyticsId="mesocycle-builder-back"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    {t('back')}
                </TrackedButton>
            </div>

            <div className="mt-6 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                <div className="inset-hi grid gap-4 rounded-[calc(1rem-0.25rem)] bg-surface p-5 sm:grid-cols-2">
                    <Field label={t('name')} htmlFor="meso-name">
                        <Input
                            id="meso-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('namePlaceholder')}
                        />
                    </Field>
                    <Field label={t('goal')} htmlFor="meso-goal">
                        <Input
                            id="meso-goal"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder={t('goalPlaceholder')}
                        />
                    </Field>
                    <Field label={t('startDate')} htmlFor="meso-start">
                        <Input
                            id="meso-start"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Field>
                    <Field label={tw('notesOptional')} htmlFor="meso-notes">
                        <Input
                            id="meso-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('notesPlaceholder')}
                        />
                    </Field>
                </div>
            </div>

            {/* Only when creating: an existing mesocycle is edited, not designed. */}
            {editing ? null : (
                <MesocycleAiPanel units={units} nameById={nameById} onApply={applyAiProposal} athleteId={athleteId} />
            )}

            <div className="mt-4 space-y-4">
                {weeks.map((week, index) => (
                    <WeekCard
                        key={week.key}
                        week={week}
                        index={index}
                        units={units}
                        locale={locale}
                        exercises={exercises ?? []}
                        nameById={nameById}
                        goal={goal}
                        // Per-week AI fill is edit-only: in create mode the block
                        // panel owns the shared draft query and the two would clash.
                        aiEnabled={editing}
                        aiOpen={aiWeekKey === week.key}
                        onOpenAi={() => setAiWeekKey(week.key)}
                        onCloseAi={() => setAiWeekKey(null)}
                        onFillAi={(proposal) => fillWeekWithAi(week.key, proposal)}
                        onLabel={(value) => patchWeek(week.key, { label: value })}
                        onRemove={() => removeWeek(week.key)}
                        onAddDay={() => addDay(week.key)}
                        onPatchDay={(dayKey, patch) => patchDay(week.key, dayKey, patch)}
                        onRemoveDay={(dayKey) => removeDay(week.key, dayKey)}
                        onDayExercises={(dayKey, updater) => setDayExercises(week.key, dayKey, updater)}
                    />
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <AddWeekControl
                    units={units}
                    canDuplicate={weeks.length > 0}
                    onAddEmpty={addWeek}
                    onDuplicate={duplicateLastWeek}
                />
            </div>

            <FormError error={error} className="mt-5" />

            <div className="mt-6 flex items-center gap-2">
                <TrackedButton
                    analyticsId="mesocycle-save"
                    type="button"
                    onClick={onSave}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    {pending ? tw('saving') : editing ? t('saveChanges') : t('createMesocycle')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="mesocycle-builder-cancel"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                >
                    {tw('cancel')}
                </TrackedButton>
            </div>
        </div>
    )
}

/**
 * Adding a week: an empty one straight from the button, or — behind the caret —
 * a copy of the last week to use as the reference to progress from, with an
 * optional weight increment (in display units).
 *
 * One control instead of two: adding a week is a single decision with two
 * answers, and the copy is the one that needs a number typed into it.
 */
function AddWeekControl({
    units,
    canDuplicate,
    onAddEmpty,
    onDuplicate,
}: {
    units: Units
    /** There is no last week to copy in a brand-new block. */
    canDuplicate: boolean
    onAddEmpty: () => void
    onDuplicate: (increment: number) => void
}) {
    const t = useTranslations('mesocycles')
    const [open, setOpen] = useState(false)
    const [increment, setIncrement] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const { mounted, className: stateClass } = useEnterExit(open)

    // Close on outside click or Escape, like the other dropdowns.
    useEffect(() => {
        if (!open) return

        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    function duplicate() {
        setOpen(false)
        onDuplicate(numberOrNull(increment) ?? 0)
    }

    return (
        <div ref={containerRef} className="relative inline-flex">
            <div className="inline-flex items-stretch overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-hairline">
                <TrackedButton
                    analyticsId="mesocycle-add-week"
                    type="button"
                    onClick={onAddEmpty}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-text transition-colors duration-300 hover:bg-white/[0.06]"
                >
                    <Plus className="size-4" /> {t('addWeek')}
                </TrackedButton>
                <span className="w-px bg-hairline" aria-hidden />
                <TrackedButton
                    analyticsId="mesocycle-week-options"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label={t('weekOptions')}
                    onClick={() => setOpen((value) => !value)}
                    className="grid place-items-center px-3 text-text-dim transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                >
                    <ChevronDown className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} />
                </TrackedButton>
            </div>

            {mounted ? (
                <div
                    role="menu"
                    data-origin="top-left"
                    className={cn(
                        't-dropdown absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline',
                        stateClass,
                    )}
                >
                    <TrackedButton
                        analyticsId="mesocycle-add-empty-week"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false)
                            onAddEmpty()
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-text-dim transition-colors duration-200 hover:bg-white/[0.05] hover:text-text"
                    >
                        {t('emptyWeek')}
                    </TrackedButton>

                    <div className="my-1 border-t border-hairline" />

                    <div className="px-3 py-2">
                        <p className="text-sm text-text">{t('duplicateLastWeek')}</p>
                        <p className="mt-0.5 text-xs text-text-faint">{t('duplicateWeekHint')}</p>

                        <div className="mt-2.5 flex items-center gap-2">
                            <label className="text-xs text-text-dim" htmlFor="week-progress">
                                {t('progressBy', { units })}
                            </label>
                            <input
                                id="week-progress"
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={increment}
                                onChange={(event) => setIncrement(event.target.value)}
                                placeholder="0"
                                className="w-16 rounded-lg bg-bg/60 px-2 py-1 text-sm text-text ring-1 ring-hairline outline-none focus:ring-ember/50"
                            />
                            <TrackedButton
                                analyticsId="mesocycle-duplicate-week"
                                type="button"
                                role="menuitem"
                                disabled={!canDuplicate}
                                onClick={duplicate}
                                className="ml-auto rounded-full bg-white/[0.06] px-4 py-1.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                            >
                                {t('duplicateWeek')}
                            </TrackedButton>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

function WeekCard({
    week,
    index,
    units,
    locale,
    exercises,
    nameById,
    goal,
    aiEnabled,
    aiOpen,
    onOpenAi,
    onCloseAi,
    onFillAi,
    onLabel,
    onRemove,
    onAddDay,
    onPatchDay,
    onRemoveDay,
    onDayExercises,
}: {
    week: DraftWeek
    index: number
    units: Units
    locale: string
    exercises: ExerciseData[]
    nameById: Map<string, string>
    goal: string
    aiEnabled: boolean
    aiOpen: boolean
    onOpenAi: () => void
    onCloseAi: () => void
    onFillAi: (proposal: AiMesocycleDraft) => void
    onLabel: (value: string) => void
    onRemove: () => void
    onAddDay: () => void
    onPatchDay: (dayKey: string, patch: Partial<DraftDay>) => void
    onRemoveDay: (dayKey: string) => void
    onDayExercises: (dayKey: string, updater: (exercises: DraftExercise[]) => DraftExercise[]) => void
}) {
    const t = useTranslations('mesocycles')
    // Days are shown one at a time via tabs; the active tab is tracked by position
    // and clamped so removals/edits never point past the end.
    const [activeIndex, setActiveIndex] = useState(0)
    const active = week.days.length === 0 ? -1 : Math.min(activeIndex, week.days.length - 1)
    const activeDay = active >= 0 ? week.days[active] : null

    // Days the week already trains, so a generated week keeps the same shape.
    const currentDayOffsets = [...new Set(week.days.map((day) => day.dayOffset))].sort((a, b) => a - b)

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="shrink-0 whitespace-nowrap font-mono text-eyebrow uppercase text-text-faint">
                            {t('week', { n: index + 1 })}
                        </span>
                        <Input
                            value={week.label}
                            onChange={(e) => onLabel(e.target.value)}
                            placeholder={t('weekLabelPlaceholder')}
                            className="w-48"
                        />
                    </div>
                    <TrackedButton
                        analyticsId="mesocycle-remove-week"
                        type="button"
                        onClick={onRemove}
                        aria-label={t('removeWeek', { n: index + 1 })}
                        className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                    >
                        <Trash className="size-4" />
                    </TrackedButton>
                </div>

                {/* Day tabs — one day visible at a time. */}
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-hairline pb-3">
                    {week.days.map((day, dayIndex) => (
                        <TrackedButton
                            key={day.key}
                            analyticsId="mesocycle-day-tab"
                            type="button"
                            onClick={() => setActiveIndex(dayIndex)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200',
                                dayIndex === active
                                    ? 'bg-white/[0.08] text-text ring-1 ring-hairline'
                                    : 'text-text-dim hover:bg-white/[0.04] hover:text-text',
                            )}
                        >
                            {t('day', { n: dayIndex + 1 })}
                            <span className="font-mono text-[10px] uppercase text-text-faint">
                                {weekdayLabel(day.dayOffset, locale)}
                            </span>
                        </TrackedButton>
                    ))}
                    <TrackedButton
                        analyticsId="mesocycle-add-day"
                        type="button"
                        onClick={() => {
                            onAddDay()
                            setActiveIndex(week.days.length)
                        }}
                        aria-label={t('addDay')}
                        className="grid size-8 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-200 hover:bg-white/[0.04] hover:text-text"
                    >
                        <Plus className="size-4" />
                    </TrackedButton>
                </div>

                {activeDay ? (
                    <div className="mt-4">
                        <DayCard
                            key={activeDay.key}
                            day={activeDay}
                            index={active}
                            units={units}
                            locale={locale}
                            exercises={exercises}
                            nameById={nameById}
                            onPatch={(patch) => onPatchDay(activeDay.key, patch)}
                            onRemove={() => {
                                onRemoveDay(activeDay.key)
                                // After removing the visible day, keep a valid tab.
                                setActiveIndex((i) => Math.max(0, Math.min(i, week.days.length - 2)))
                            }}
                            onExercises={(updater) => onDayExercises(activeDay.key, updater)}
                        />
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-text-faint">{t('noDaysYet')}</p>
                )}

                {aiEnabled ? (
                    aiOpen ? (
                        <MesocycleWeekAiPanel
                            units={units}
                            goal={goal}
                            currentDayOffsets={currentDayOffsets}
                            nameById={nameById}
                            onApply={onFillAi}
                            onClose={onCloseAi}
                        />
                    ) : (
                        <TrackedButton
                            analyticsId="mesocycle-week-ai-open"
                            type="button"
                            onClick={onOpenAi}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            <Bolt className="size-3.5" /> {t('fillWithAi')}
                        </TrackedButton>
                    )
                ) : null}
            </div>
        </div>
    )
}

function DayCard({
    day,
    index,
    units,
    locale,
    exercises,
    nameById,
    onPatch,
    onRemove,
    onExercises,
}: {
    day: DraftDay
    index: number
    units: Units
    locale: string
    exercises: ExerciseData[]
    nameById: Map<string, string>
    onPatch: (patch: Partial<DraftDay>) => void
    onRemove: () => void
    onExercises: (updater: (exercises: DraftExercise[]) => DraftExercise[]) => void
}) {
    const t = useTranslations('mesocycles')
    const tw = useTranslations('workouts')
    const [picking, setPicking] = useState(false)

    function addExercise(exerciseId: string) {
        onExercises((list) => [...list, { key: newKey(), exerciseId, notes: '', sets: [emptySet()] }])
        setPicking(false)
    }

    function importExercises(imported: DraftExercise[]) {
        onExercises((list) => [...list, ...imported])
    }

    function patchExercise(exerciseKey: string, patch: Partial<DraftExercise>) {
        onExercises((list) => list.map((e) => (e.key === exerciseKey ? { ...e, ...patch } : e)))
    }

    function removeExercise(exerciseKey: string) {
        onExercises((list) => list.filter((e) => e.key !== exerciseKey))
    }

    return (
        <div className="rounded-xl bg-bg/40 p-4 ring-1 ring-hairline">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {t('day', { n: index + 1 })}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((offset) => (
                            <TrackedButton
                                key={offset}
                                analyticsId="mesocycle-day-weekday"
                                type="button"
                                onClick={() => onPatch({ dayOffset: offset })}
                                className={cn(
                                    'rounded-full px-2.5 py-1 text-xs transition-colors duration-200',
                                    day.dayOffset === offset
                                        ? 'bg-ember/15 text-ember ring-1 ring-ember/30'
                                        : 'text-text-dim hover:bg-white/[0.05]',
                                )}
                            >
                                {weekdayLabel(offset, locale)}
                            </TrackedButton>
                        ))}
                    </div>
                    <Input
                        value={day.label}
                        onChange={(e) => onPatch({ label: e.target.value })}
                        placeholder={t('dayLabelPlaceholder')}
                        className="w-full sm:w-40"
                    />
                </div>
                <TrackedButton
                    analyticsId="mesocycle-remove-day"
                    type="button"
                    onClick={onRemove}
                    aria-label={t('removeDay', { n: index + 1 })}
                    className="grid size-7 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                >
                    <Close className="size-3.5" />
                </TrackedButton>
            </div>

            <div className="mt-3 space-y-2">
                {day.exercises.map((exercise) => (
                    <ExerciseBlock
                        key={exercise.key}
                        exercise={exercise}
                        name={nameById.get(exercise.exerciseId) ?? tw('exercise')}
                        units={units}
                        onPatch={(patch) => patchExercise(exercise.key, patch)}
                        onRemove={() => removeExercise(exercise.key)}
                    />
                ))}
                {day.exercises.length === 0 ? <p className="text-sm text-text-faint">{t('noExercisesYet')}</p> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {picking ? (
                    <div className="w-full">
                        <ExercisePicker exercises={exercises} onPick={addExercise} onClose={() => setPicking(false)} />
                    </div>
                ) : (
                    <>
                        <TrackedButton
                            analyticsId="mesocycle-add-exercise"
                            type="button"
                            onClick={() => setPicking(true)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            <Plus className="size-3.5" /> {tw('addExercise')}
                        </TrackedButton>
                        <ImportFromTemplate units={units} onImport={importExercises} />
                    </>
                )}
            </div>
        </div>
    )
}

const cellClass =
    'w-full rounded-xl bg-bg/60 px-3 py-2 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50'

function ExerciseBlock({
    exercise,
    name,
    units,
    onPatch,
    onRemove,
}: {
    exercise: DraftExercise
    name: string
    units: Units
    onPatch: (patch: Partial<DraftExercise>) => void
    onRemove: () => void
}) {
    const t = useTranslations('mesocycles')
    const tw = useTranslations('workouts')

    function patchSet(setKey: string, patch: Partial<DraftSet>) {
        onPatch({ sets: exercise.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) })
    }

    function addSet() {
        const last = exercise.sets[exercise.sets.length - 1]
        const next: DraftSet = last ? { ...last, key: newKey() } : emptySet()
        onPatch({ sets: [...exercise.sets, next] })
    }

    function removeSet(setKey: string) {
        onPatch({ sets: exercise.sets.filter((s) => s.key !== setKey) })
    }

    return (
        <div className="rounded-xl bg-surface p-4 ring-1 ring-hairline">
            <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-text">{name}</h4>
                <TrackedButton
                    analyticsId="mesocycle-remove-exercise"
                    type="button"
                    onClick={onRemove}
                    aria-label={t('removeExercise', { name })}
                    className="grid size-7 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                >
                    <Trash className="size-3.5" />
                </TrackedButton>
            </div>

            <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    <span>#</span>
                    <span>{tw('weightLabel', { units })}</span>
                    <span>{tw('reps')}</span>
                    <span>{tw('intensity')}</span>
                    <span />
                </div>
                {exercise.sets.map((set, index) => (
                    <SetRow
                        key={set.key}
                        set={set}
                        index={index + 1}
                        onPatch={(patch) => patchSet(set.key, patch)}
                        onRemove={() => removeSet(set.key)}
                    />
                ))}
            </div>

            <TrackedButton
                analyticsId="mesocycle-add-set"
                type="button"
                onClick={addSet}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
            >
                <Plus className="size-3.5" /> {tw('addSet')}
            </TrackedButton>
        </div>
    )
}

function SetRow({
    set,
    index,
    onPatch,
    onRemove,
}: {
    set: DraftSet
    index: number
    onPatch: (patch: Partial<DraftSet>) => void
    onRemove: () => void
}) {
    const t = useTranslations('templates')
    return (
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2">
            <span className="text-right font-mono text-xs text-text-faint">{index}</span>
            <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={set.weight}
                onChange={(e) => onPatch({ weight: e.target.value })}
                placeholder="—"
                className={cellClass}
            />
            <input
                type="number"
                inputMode="numeric"
                min={1}
                value={set.reps}
                onChange={(e) => onPatch({ reps: e.target.value })}
                placeholder="—"
                className={cellClass}
            />
            <div className="flex items-center gap-1.5">
                <select
                    value={set.intensityKind}
                    onChange={(e) => onPatch({ intensityKind: e.target.value as IntensityKind, intensity: '' })}
                    className={cn(cellClass, 'appearance-none')}
                    aria-label={t('intensityType')}
                >
                    <option value="none">—</option>
                    <option value="rpe">RPE</option>
                    <option value="rir">RIR</option>
                </select>
                <input
                    type="number"
                    inputMode="decimal"
                    step={set.intensityKind === 'rpe' ? '0.5' : '1'}
                    value={set.intensity}
                    onChange={(e) => onPatch({ intensity: e.target.value })}
                    disabled={set.intensityKind === 'none'}
                    placeholder={set.intensityKind === 'none' ? '' : '0'}
                    className={cn(cellClass, 'w-16 disabled:opacity-40')}
                    aria-label={t('intensityValue')}
                />
            </div>
            <TrackedButton
                analyticsId="mesocycle-remove-set"
                type="button"
                onClick={onRemove}
                aria-label={t('removeSet', { index })}
                className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
            >
                <Close className="size-4" />
            </TrackedButton>
        </div>
    )
}

/** Pick a saved template and import its exercises into the current day. */
function ImportFromTemplate({ units, onImport }: { units: Units; onImport: (exercises: DraftExercise[]) => void }) {
    const t = useTranslations('mesocycles')
    const { data: templates } = useWorkoutTemplates()
    const [open, setOpen] = useState(false)
    const [pickedId, setPickedId] = useState<string | null>(null)

    const items = templates ?? []

    return (
        <div className="relative">
            <TrackedButton
                analyticsId="mesocycle-import-template-open"
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
            >
                <ChevronDown className="size-3.5" /> {t('importTemplate')}
            </TrackedButton>

            {open ? (
                <ul className="absolute z-20 mt-1.5 max-h-64 w-64 overflow-y-auto rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline">
                    {items.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-text-faint">{t('noTemplates')}</li>
                    ) : (
                        items.map((template) => (
                            <li key={template.id}>
                                <TrackedButton
                                    analyticsId="mesocycle-import-template-pick"
                                    type="button"
                                    onClick={() => {
                                        setPickedId(template.id)
                                        setOpen(false)
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.05]"
                                >
                                    <span className="truncate text-sm text-text">{template.name}</span>
                                </TrackedButton>
                            </li>
                        ))
                    )}
                </ul>
            ) : null}

            {pickedId ? (
                <TemplateImporter
                    id={pickedId}
                    units={units}
                    onLoaded={(exercises) => {
                        onImport(exercises)
                        setPickedId(null)
                    }}
                />
            ) : null}
        </div>
    )
}

/** Lazily loads a template and hands its exercises up once, then unmounts. */
function TemplateImporter({
    id,
    units,
    onLoaded,
}: {
    id: string
    units: Units
    onLoaded: (exercises: DraftExercise[]) => void
}) {
    const { data } = useWorkoutTemplate(id)
    useEffect(() => {
        if (data) onLoaded(templateToDraftExercises(data, units))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])
    return null
}

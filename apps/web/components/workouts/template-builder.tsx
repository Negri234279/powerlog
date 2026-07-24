'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useExercises } from '@/lib/graphql/hooks/use-workouts'
import {
    useCreateWorkoutTemplate,
    useUpdateWorkoutTemplate,
    useWorkoutTemplate,
} from '@/lib/graphql/hooks/use-workout-templates'
import { unitsOf } from '@/lib/units'
import {
    fieldKey,
    fieldSpec,
    rangeErrorKey,
    SET_FIELDS,
    type SetField,
    validatePlanned,
} from '@/lib/workouts/planned-validation'
import { Field, Input } from '@/components/ui/field'
import { UpgradeGate, isPlanRefusal } from '@/components/billing/upgrade-gate'
import { FormError } from '@/components/ui/form-error'
import { Plus } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { type DraftExercise, type DraftSet, draftFromTemplate, emptySet, newKey, textOrNull } from './template-draft'
import { ExerciseCard } from './template-exercise-card'
import { ExercisePicker } from './exercise-picker'

/**
 * Create/edit a workout template as a whole tree: name + notes + exercises, each
 * with programmed sets (weight/reps/RPE-or-RIR/notes). Weights are entered in the
 * user's display unit and sent with `unit` so the API stores canonical kg.
 */
export function TemplateBuilder({
    templateId,
    onClose,
    onSaved,
}: {
    templateId: string | null
    onClose: () => void
    onSaved: () => void
}) {
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const { data: exercises } = useExercises()
    const editing = templateId !== null
    const { data: loaded, isLoading: loadingTemplate } = useWorkoutTemplate(templateId)

    const create = useCreateWorkoutTemplate()
    const update = useUpdateWorkoutTemplate()
    const pending = create.isPending || update.isPending

    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')
    const [draft, setDraft] = useState<DraftExercise[]>([])
    // Message + raw error travel together: the raw one lets a plan refusal render an
    // upgrade CTA instead of a plain message, and both clear on the next save.
    const [submitError, setSubmitError] = useState<{ message: string | null; raw: unknown }>({
        message: null,
        raw: null,
    })
    const [picking, setPicking] = useState(false)
    // Per-field client validation messages, keyed by 'name' and `${setKey}.<field>`.
    // A field validates on blur; Save re-checks every field at once so the whole
    // form's problems surface together, not one back-end error at a time.
    const [errors, setErrors] = useState<Record<string, string>>({})

    /** Validate a single set cell (on blur), setting or clearing just its error. */
    function validateField(set: DraftSet, field: SetField) {
        const spec = fieldSpec(set, field)
        const code = spec ? validatePlanned(spec.text, spec.planned, units) : null

        setErrors((prev) => {
            const next = { ...prev }
            delete next[fieldKey(set.key, field)]

            if (spec && code) {
                next[spec.key] = tw(rangeErrorKey(code, spec.planned))
            }

            return next
        })
    }

    /** Validate the name on blur (required), setting or clearing its error. */
    function validateName() {
        setErrors((prev) => {
            const next = { ...prev }
            
            if (name.trim() === '') {
                next['name'] = t('nameRequired')
            } else {
                delete next['name']
            }

            return next
        })
    }

    /** Check the whole form at once — the name plus every set cell — and return
     *  the complete error map, so Save can reveal all problems in one pass. */
    function collectErrors(): Record<string, string> {
        const found: Record<string, string> = {}
        if (name.trim() === '') found['name'] = t('nameRequired')

        for (const exercise of draft) {
            for (const set of exercise.sets) {
                for (const field of SET_FIELDS) {
                    const spec = fieldSpec(set, field)
                    if (!spec) continue

                    const code = validatePlanned(spec.text, spec.planned, units)
                    if (code) found[spec.key] = tw(rangeErrorKey(code, spec.planned))
                }
            }
        }

        return found
    }

    // Seed the form from the loaded template (once it arrives, for edit mode).
    const [seeded, setSeeded] = useState(false)
    useEffect(() => {
        if (editing && loaded && !seeded) {
            setName(loaded.name)
            setNotes(loaded.notes ?? '')
            setDraft(draftFromTemplate(loaded, units))
            setSeeded(true)
        }
    }, [editing, loaded, seeded, units])

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) {
            map.set(exercise.id, exercise.name)
        }

        return map
    }, [exercises])

    function addExercise(exerciseId: string) {
        setDraft((d) => [...d, { key: newKey(), exerciseId, notes: '', sets: [emptySet()] }])
        setPicking(false)
    }

    function removeExercise(key: string) {
        setDraft((d) => d.filter((e) => e.key !== key))
    }

    function patchExercise(key: string, patch: Partial<DraftExercise>) {
        setDraft((d) => d.map((e) => (e.key === key ? { ...e, ...patch } : e)))
    }

    function addSet(exerciseKey: string) {
        setDraft((d) =>
            d.map((e) => {
                if (e.key !== exerciseKey) return e
                // Clone the last set's targets for speed; fresh if there are none.
                const last = e.sets[e.sets.length - 1]
                const next: DraftSet = last ? { ...last, key: newKey() } : emptySet()

                return {
                    ...e,
                    sets: [...e.sets, next],
                }
            }),
        )
    }

    function patchSet(exerciseKey: string, setKey: string, patch: Partial<DraftSet>) {
        setDraft((d) =>
            d.map((e) =>
                e.key === exerciseKey
                    ? { ...e, sets: e.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) }
                    : e,
            ),
        )
    }

    function removeSet(exerciseKey: string, setKey: string) {
        setDraft((d) =>
            d.map((e) => (e.key === exerciseKey ? { ...e, sets: e.sets.filter((s) => s.key !== setKey) } : e)),
        )
    }

    // Clone one set and drop the copy right below it — so duplicating row 2 lands a
    // new row 3, not a set appended at the end.
    function duplicateSet(exerciseKey: string, setKey: string) {
        setDraft((d) =>
            d.map((e) => {
                if (e.key !== exerciseKey) return e

                const i = e.sets.findIndex((s) => s.key === setKey)
                const source = e.sets[i]
                if (!source) return e

                const clone: DraftSet = {
                    ...source,
                    key: newKey(),
                }

                return {
                    ...e,
                    sets: [...e.sets.slice(0, i + 1), clone, ...e.sets.slice(i + 1)],
                }
            }),
        )
    }

    async function onSave() {
        setSubmitError({ message: null, raw: null })

        // Validate the whole form up front and show every problem together, rather
        // than letting the back-end reject one field at a time.
        const found = collectErrors()
        setErrors(found)

        if (Object.keys(found).length > 0) {
            setSubmitError({ message: t('fixErrors'), raw: null })
            return
        }

        const input = {
            name: name.trim(),
            notes: notes.trim() === '' ? null : notes.trim(),
            exercises: draft.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                notes: exercise.notes.trim() === '' ? null : exercise.notes.trim(),
                sets: exercise.sets.map((set) => ({
                    unit: units,
                    plannedWeight: textOrNull(set.weight),
                    plannedReps: textOrNull(set.reps),
                    rpe: set.intensityKind === 'rpe' ? textOrNull(set.intensity) : null,
                    rir: set.intensityKind === 'rir' ? textOrNull(set.intensity) : null,
                    notes: set.notes.trim() === '' ? null : set.notes.trim(),
                })),
            })),
        }

        try {
            if (editing) {
                await update.mutateAsync({ id: templateId, input })
                track('workout_template_updated', {})
            } else {
                await create.mutateAsync(input)
                track('workout_template_created', {})
            }

            onSaved()
        } catch (err) {
            setSubmitError({ message: errorMessage(err), raw: err })
        }
    }

    if (editing && loadingTemplate && !seeded) {
        return <p className="text-body text-text-dim">{t('loadingTemplate')}</p>
    }

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                    <h1 className="mt-1 font-display text-h2 tracking-tight">
                        {editing ? t('editTitle') : t('newTemplate')}
                    </h1>
                </div>
                <TrackedButton
                    analyticsId="template-builder-back"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    {t('back')}
                </TrackedButton>
            </div>

            <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi flex flex-col gap-4 rounded-[calc(1rem-0.25rem)] bg-surface p-5 sm:flex-row">
                        <div className="w-full sm:w-72">
                            <Field label={t('name')} htmlFor="tmpl-name" error={errors['name']}>
                                <Input
                                    id="tmpl-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={validateName}
                                    aria-invalid={errors['name'] ? true : undefined}
                                    placeholder={t('namePlaceholder')}
                                />
                            </Field>
                        </div>
                        <div className="flex-1">
                            <Field label={tw('notesOptional')} htmlFor="tmpl-notes">
                                <Input
                                    id="tmpl-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('notesPlaceholder')}
                                />
                            </Field>
                        </div>
                    </div>
                </div>

                {draft.map((exercise) => (
                    <ExerciseCard
                        key={exercise.key}
                        exercise={exercise}
                        name={nameById.get(exercise.exerciseId) ?? tw('exercise')}
                        units={units}
                        errors={errors}
                        onRemove={() => removeExercise(exercise.key)}
                        onNotes={(value) => patchExercise(exercise.key, { notes: value })}
                        onAddSet={() => addSet(exercise.key)}
                        onPatchSet={(setKey, patch) => patchSet(exercise.key, setKey, patch)}
                        onRemoveSet={(setKey) => removeSet(exercise.key, setKey)}
                        onDuplicateSet={(setKey) => duplicateSet(exercise.key, setKey)}
                        onValidateSet={validateField}
                    />
                ))}

                {picking ? (
                    <ExercisePicker
                        exercises={exercises ?? []}
                        onPick={addExercise}
                        onClose={() => setPicking(false)}
                    />
                ) : (
                    <TrackedButton
                        analyticsId="template-add-exercise"
                        type="button"
                        onClick={() => setPicking(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                    >
                        <Plus className="size-4" /> {tw('addExercise')}
                    </TrackedButton>
                )}
            </div>

            {isPlanRefusal(submitError.raw) ? (
                <div className="mt-5">
                    <UpgradeGate error={submitError.raw} />
                </div>
            ) : (
                <FormError error={submitError.message} className="mt-5" />
            )}

            <div className="mt-6 flex items-center gap-2">
                <TrackedButton
                    analyticsId="template-save"
                    type="button"
                    onClick={onSave}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    {pending ? tw('saving') : editing ? t('saveChanges') : t('createTemplate')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="template-builder-cancel"
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

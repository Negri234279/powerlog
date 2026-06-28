'use client'

import { useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useExercises } from '@/lib/graphql/hooks/use-workouts'
import {
    type WorkoutTemplateSummary,
    useWorkoutTemplate,
    useWorkoutTemplates,
} from '@/lib/graphql/hooks/use-workout-templates'
import { formatWeight, type Units, unitsOf } from '@/lib/units'
import { Modal } from '@/components/ui/modal'
import { ChevronDown, Close, Dumbbell, Search } from '@/components/ui/icons'

/** The minimal shape both the combobox and the modal hand back on selection. */
export interface SelectedTemplate {
    id: string
    name: string
}

// ── Combobox ─────────────────────────────────────────────────

/**
 * Searchable template selector: type to filter by name, pick from the dropdown.
 * Pairs with a "Browse" button (for the richer modal) supplied by the parent.
 */
export function TemplateCombobox({
    value,
    onChange,
    onBrowse,
}: {
    value: SelectedTemplate | null
    onChange: (template: SelectedTemplate | null) => void
    onBrowse: () => void
}) {
    const { data: templates } = useWorkoutTemplates()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const term = query.trim().toLowerCase()
    const filtered = useMemo(
        () => (templates ?? []).filter((t) => term === '' || t.name.toLowerCase().includes(term)),
        [templates, term],
    )

    function pick(template: WorkoutTemplateSummary) {
        onChange({ id: template.id, name: template.name })
        setQuery('')
        setOpen(false)
    }

    // A chosen template shows as a chip; clearing returns to the search input.
    if (value) {
        return (
            <div className="flex items-center gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 rounded-2xl bg-ember/10 px-3.5 py-3 text-sm text-ember ring-1 ring-ember/30">
                    <Dumbbell className="size-4 shrink-0" />
                    <span className="truncate">{value.name}</span>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        aria-label="Clear template"
                        className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-300 hover:bg-ember/20"
                    >
                        <Close className="size-3.5" />
                    </button>
                </span>
                <button
                    type="button"
                    onClick={onBrowse}
                    className="rounded-2xl px-3 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    Browse
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => {
                        // Delay so a click on a list item registers before we close.
                        blurTimer.current = setTimeout(() => setOpen(false), 120)
                    }}
                    placeholder="Search a template…"
                    className="w-full rounded-2xl bg-bg/60 py-3 pl-10 pr-9 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50"
                />
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />

                {open && filtered.length > 0 ? (
                    <ul className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline">
                        {filtered.map((template) => (
                            <li key={template.id}>
                                <button
                                    type="button"
                                    // onMouseDown beats the input's onBlur, so the pick lands.
                                    onMouseDown={() => {
                                        if (blurTimer.current) clearTimeout(blurTimer.current)
                                        pick(template)
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.05]"
                                >
                                    <span className="truncate text-sm text-text">{template.name}</span>
                                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                        {template.exerciseCount} ex · {template.setCount} sets
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            <button
                type="button"
                onClick={onBrowse}
                className="rounded-2xl px-3.5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
            >
                Browse
            </button>
        </div>
    )
}

// ── Browse modal (richer view with exercise preview) ─────────

export function TemplateBrowseModal({
    open,
    onClose,
    onSelect,
}: {
    open: boolean
    onClose: () => void
    onSelect: (template: SelectedTemplate) => void
}) {
    const { data: templates, isLoading } = useWorkoutTemplates()
    const [query, setQuery] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const term = query.trim().toLowerCase()
    const filtered = useMemo(
        () => (templates ?? []).filter((t) => term === '' || t.name.toLowerCase().includes(term)),
        [templates, term],
    )

    return (
        <Modal open={open} onClose={onClose} className="max-w-lg">
            <h2 className="font-display text-h3 tracking-tight">Choose a template</h2>
            <p className="mt-1 text-sm text-text-dim">Start a session pre-filled from one of your templates.</p>

            <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full rounded-2xl bg-bg/60 py-3 pl-10 pr-4 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50"
                />
            </div>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-text-dim">Loading templates…</p>
                ) : filtered.length === 0 ? (
                    <p className="py-6 text-center text-sm text-text-faint">
                        {term === '' ? 'You have no templates yet.' : 'No templates match.'}
                    </p>
                ) : (
                    filtered.map((template) => (
                        <BrowseCard
                            key={template.id}
                            template={template}
                            expanded={expandedId === template.id}
                            onToggle={() => setExpandedId((id) => (id === template.id ? null : template.id))}
                            onUse={() => onSelect({ id: template.id, name: template.name })}
                        />
                    ))
                )}
            </div>
        </Modal>
    )
}

function BrowseCard({
    template,
    expanded,
    onToggle,
    onUse,
}: {
    template: WorkoutTemplateSummary
    expanded: boolean
    onToggle: () => void
    onUse: () => void
}) {
    return (
        <div className="rounded-2xl bg-bg/40 ring-1 ring-hairline">
            <div className="flex items-center gap-3 p-3">
                <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-text">{template.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {template.exerciseCount} ex · {template.setCount} sets
                    </p>
                </button>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={expanded ? 'Hide preview' : 'Show preview'}
                    className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                >
                    <ChevronDown className={cn('size-4 transition-transform duration-300', expanded && 'rotate-180')} />
                </button>
                <button
                    type="button"
                    onClick={onUse}
                    className="shrink-0 rounded-full bg-ember/10 px-3.5 py-1.5 text-xs font-medium text-ember ring-1 ring-ember/30 transition-colors duration-300 hover:bg-ember/20"
                >
                    Use
                </button>
            </div>
            {expanded ? <TemplatePreview id={template.id} /> : null}
        </div>
    )
}

function TemplatePreview({ id }: { id: string }) {
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const { data: template, isLoading } = useWorkoutTemplate(id)
    const { data: exercises } = useExercises()

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)
        return map
    }, [exercises])

    if (isLoading || !template) {
        return <p className="border-t border-hairline px-3 py-3 text-xs text-text-dim">Loading preview…</p>
    }

    if (template.notes === null && template.exercises.length === 0) {
        return <p className="border-t border-hairline px-3 py-3 text-xs text-text-faint">Empty template.</p>
    }

    return (
        <div className="space-y-3 border-t border-hairline px-3 py-3">
            {template.notes ? <p className="text-xs text-text-dim">{template.notes}</p> : null}
            {template.exercises.map((exercise) => (
                <div key={exercise.id}>
                    <p className="text-xs font-medium text-text">{nameById.get(exercise.exerciseId) ?? 'Exercise'}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-faint">
                        {exercise.sets.length === 0
                            ? 'no sets'
                            : exercise.sets.map((set) => formatSet(set, units)).join('  ·  ')}
                    </p>
                </div>
            ))}
        </div>
    )
}

/** A compact programmed-set label, e.g. "100kg×5 @RPE8" / "×8" / "100kg". */
function formatSet(
    set: { plannedWeightKg: number | null; plannedReps: number | null; rpe: number | null; rir: number | null },
    units: Units,
): string {
    const weight = set.plannedWeightKg !== null ? formatWeight(set.plannedWeightKg, units) : null
    const core =
        weight && set.plannedReps !== null
            ? `${weight}×${set.plannedReps}`
            : set.plannedReps !== null
              ? `×${set.plannedReps}`
              : (weight ?? '—')
    const intensity = set.rpe !== null ? ` @RPE${set.rpe}` : set.rir !== null ? ` @RIR${set.rir}` : ''
    return `${core}${intensity}`
}

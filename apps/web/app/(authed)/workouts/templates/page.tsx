'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import { gqlErrorMessage } from '@/lib/graphql/error'
import {
    type WorkoutTemplateSummary,
    useCreateSessionFromTemplate,
    useDeleteWorkoutTemplate,
    useWorkoutTemplates,
} from '@/lib/graphql/hooks/use-workout-templates'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { TemplateBuilder } from '@/components/workouts/template-builder'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { Dumbbell, Plus } from '@/components/ui/icons'
import { Menu } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; id: string }

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function TemplateCard({
    template,
    onEdit,
    onDelete,
    onStart,
    starting,
}: {
    template: WorkoutTemplateSummary
    onEdit: () => void
    onDelete: () => void
    onStart: () => void
    starting: boolean
}) {
    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline transition-all duration-300 hover:ring-text/20">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate font-display text-lg tracking-tight">{template.name}</h3>
                        {template.notes ? (
                            <p className="mt-0.5 max-w-md truncate text-sm text-text-dim">{template.notes}</p>
                        ) : null}
                    </div>
                    <Menu
                        label="Template actions"
                        items={[
                            { label: 'Edit', onSelect: onEdit },
                            { label: 'Delete', onSelect: onDelete, destructive: true },
                        ]}
                    />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {template.exerciseCount} {template.exerciseCount === 1 ? 'exercise' : 'exercises'} ·{' '}
                        {template.setCount} {template.setCount === 1 ? 'set' : 'sets'} ·{' '}
                        {formatDate(template.updatedAt)}
                    </p>
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={starting}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-1.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                    >
                        <Plus className="size-3.5" /> Start session
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function TemplatesPage() {
    const router = useRouter()
    const [view, setView] = useState<View>({ mode: 'list' })
    const [rawSearch, setRawSearch] = useState('')
    const search = useDebouncedValue(rawSearch.trim(), 300)

    const { data: templates, isLoading } = useWorkoutTemplates(search || undefined)
    const del = useDeleteWorkoutTemplate()
    const startSession = useCreateSessionFromTemplate()

    const [deleting, setDeleting] = useState<WorkoutTemplateSummary | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [startError, setStartError] = useState<string | null>(null)

    if (view.mode !== 'list') {
        return (
            <TemplateBuilder
                key={view.mode === 'edit' ? view.id : 'new'}
                templateId={view.mode === 'edit' ? view.id : null}
                onClose={() => setView({ mode: 'list' })}
                onSaved={() => setView({ mode: 'list' })}
            />
        )
    }

    function onStart(template: WorkoutTemplateSummary) {
        setStartError(null)
        startSession.mutate(
            { templateId: template.id },
            {
                onSuccess: (r) => {
                    track('session_created_from_template', {})
                    router.push(`/workouts/${r.createSessionFromTemplate.id}`)
                },
                onError: (err) => setStartError(gqlErrorMessage(err)),
            },
        )
    }

    function onConfirmDelete() {
        if (!deleting) return
        setDeleteError(null)
        del.mutate(deleting.id, {
            onSuccess: () => {
                track('workout_template_deleted', {})
                setDeleting(null)
            },
            onError: (err) => setDeleteError(gqlErrorMessage(err)),
        })
    }

    const items = templates ?? []
    const hasSearch = search !== ''

    return (
        <div>
            <Link
                href="/workouts"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                ← Workouts
            </Link>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">Training</p>
                    <h1 className="mt-1 font-display text-display">Templates</h1>
                </TextsReveal>
                <button
                    type="button"
                    onClick={() => setView({ mode: 'new' })}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="size-4" /> New template
                </button>
            </div>

            <FormError error={startError} className="mt-4" />

            {(items.length > 0 || hasSearch) && !isLoading ? (
                <div className="mt-6">
                    <ClearableSearch
                        value={rawSearch}
                        onChange={setRawSearch}
                        placeholder="Search templates…"
                        className="w-full sm:w-80"
                    />
                </div>
            ) : null}

            <div className="mt-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                        <div className="inset-hi flex flex-col items-start rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                            <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                                <Dumbbell className="size-6" />
                            </span>
                            <h2 className="mt-5 font-display text-h3">
                                {hasSearch ? 'No matching templates' : 'No templates yet'}
                            </h2>
                            <p className="mt-2 max-w-sm text-body text-text-dim">
                                {hasSearch
                                    ? 'Try a different name.'
                                    : 'Build a reusable session — pick your exercises and program sets once, then start a session from it in a tap.'}
                            </p>
                            {!hasSearch ? (
                                <button
                                    type="button"
                                    onClick={() => setView({ mode: 'new' })}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                                >
                                    <Plus className="size-4" /> Create your first template
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {items.map((template) => (
                            <li key={template.id}>
                                <TemplateCard
                                    template={template}
                                    onEdit={() => setView({ mode: 'edit', id: template.id })}
                                    onDelete={() => {
                                        setDeleteError(null)
                                        setDeleting(template)
                                    }}
                                    onStart={() => onStart(template)}
                                    starting={startSession.isPending}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ConfirmModal
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={onConfirmDelete}
                title="Delete template?"
                description={
                    deleting
                        ? `“${deleting.name}” will be permanently removed. Sessions already created from it are not affected.`
                        : undefined
                }
                confirmLabel="Delete"
                destructive
                pending={del.isPending}
                error={deleteError}
            />
        </div>
    )
}

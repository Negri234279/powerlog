'use client'

import { type FormEvent, useId, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { type WorkoutHistoryItem, useUpdateWorkoutSession } from '@/lib/graphql/hooks/use-workouts'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Modal } from '@/components/ui/modal'

/** A session's `performedAt` as YYYY-MM-DD in the user's local timezone. */
function toDateInput(iso: string): string {
    const d = new Date(iso)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

/**
 * Edit a session's date and notes. Mounted only while editing (one per session),
 * so its fields seed straight from props. Sends `performedAt` only when the day
 * actually changes; notes are always sent (empty clears them).
 */
export function EditSessionModal({ session, onClose }: { session: WorkoutHistoryItem; onClose: () => void }) {
    const update = useUpdateWorkoutSession()
    const titleId = useId()
    const originalDate = toDateInput(session.performedAt)
    const [date, setDate] = useState(originalDate)
    const [notes, setNotes] = useState(session.notes ?? '')
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        const trimmed = notes.trim()
        try {
            await update.mutateAsync({
                sessionId: session.id,
                // Noon UTC keeps it reading as that calendar date everywhere.
                performedAt: date === originalDate ? undefined : `${date}T12:00:00.000Z`,
                notes: trimmed === '' ? null : trimmed,
            })
            track('workout_session_updated', {})
            onClose()
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    return (
        <Modal open onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                Edit session
            </h2>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <Field label="Date" htmlFor="edit-performedAt">
                    <Input id="edit-performedAt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Notes (optional)" htmlFor="edit-notes">
                    <Input
                        id="edit-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Lower body, week 4"
                    />
                </Field>

                <FormError error={error} />

                <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={update.isPending}
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={update.isPending}
                        className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                    >
                        {update.isPending ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

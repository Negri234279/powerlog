'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useId, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type WorkoutHistoryItem, useUpdateWorkoutSession } from '@/lib/graphql/hooks/use-workouts'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Modal } from '@/components/ui/modal'
import { TrackedButton } from '@/components/ui/tracked'

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
    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const update = useUpdateWorkoutSession()
    const titleId = useId()
    const originalDate = toDateInput(session.performedAt)
    const [date, setDate] = useState(originalDate)
    const [notes, setNotes] = useState(session.notes ?? '')
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
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
            setError(errorMessage(err))
        }
    }

    return (
        <Modal open onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {t('editSession')}
            </h2>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <Field label={tw('date')} htmlFor="edit-performedAt">
                    <Input id="edit-performedAt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label={tw('notesOptional')} htmlFor="edit-notes">
                    <Input
                        id="edit-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={tw('notesPlaceholder')}
                    />
                </Field>

                <FormError error={error} />

                <div className="flex items-center justify-end gap-2 pt-1">
                    <TrackedButton
                        analyticsId="session-edit-cancel"
                        type="button"
                        onClick={onClose}
                        disabled={update.isPending}
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                    >
                        {tw('cancel')}
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="session-edit-save"
                        type="submit"
                        disabled={update.isPending}
                        className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                    >
                        {update.isPending ? tw('saving') : t('saveChanges')}
                    </TrackedButton>
                </div>
            </form>
        </Modal>
    )
}

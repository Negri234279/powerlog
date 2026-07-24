'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useAthleteNote, useSetAthleteNote } from '@/lib/graphql/hooks/use-coaching'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

/** Quiet period after the last keystroke before the note is persisted. */
const AUTOSAVE_MS = 800

/**
 * The coach's private note on one athlete — context, not a destination, so it
 * lives in the detail shell beside the athlete's identity rather than behind a
 * section of its own. A note the coach can only reach by leaving the training
 * they are looking at is a note they write once and never read again.
 *
 * It autosaves. There is no Save button on purpose: the note used to sit in a
 * tab that unmounted on navigation, which silently threw away whatever had been
 * typed and not saved. Persisting on a quiet timer plus on blur means leaving
 * the field — by clicking a section link, or anywhere else — commits it.
 */
export function AthleteNote({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()

    const note = useAthleteNote(athleteId)
    const { mutate, isPending, isSuccess } = useSetAthleteNote(athleteId)

    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // The draft wins once the coach types; until then the field tracks the server.
    // No seeding effect, so a refetch can never clobber an edit in progress.
    const stored = note.data?.body ?? ''
    const value = draft ?? stored
    const dirty = value.trim() !== stored

    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [])

    function commit(next: string) {
        if (timer.current) {
            clearTimeout(timer.current)
            timer.current = null
        }

        const body = next.trim()
        if (body === stored) return

        setError(null)
        mutate(body, { onError: (err) => setError(errorMessage(err)) })
    }

    function onChange(next: string) {
        setDraft(next)
        setError(null)

        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => commit(next), AUTOSAVE_MS)
    }

    const status = isPending ? t('noteSaving') : dirty ? t('noteUnsaved') : isSuccess ? t('noteSaved') : null

    // Collapsed, an empty box and a written note look identical — show the first
    // line so the coach knows there is something in there worth opening.
    const preview = stored.split('\n')[0]

    return (
        <div className="t-acc rounded-2xl bg-bg/40 ring-1 ring-hairline" data-open={open}>
            <TrackedButton
                analyticsId="athlete-note-toggle"
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
                <span className="t-acc-chevron shrink-0 text-text-faint">
                    <ChevronDown className="size-4" />
                </span>
                <span className="shrink-0 font-display text-base tracking-tight">{t('noteTitle')}</span>

                {!open && preview !== '' ? <span className="truncate text-sm text-text-faint">{preview}</span> : null}

                {status ? (
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {status}
                    </span>
                ) : null}
            </TrackedButton>

            <div className="t-acc-panel">
                <div className="t-acc-panel-inner">
                    <div className="px-5 pb-5">
                        <p className="text-sm text-text-dim">{t('noteSubtitle')}</p>

                        <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onBlur={() => commit(value)}
                            placeholder={t('notePlaceholder')}
                            rows={5}
                            // Until the stored note has arrived the field shows an
                            // empty string; accepting keystrokes into that would
                            // commit a draft that overwrites the real note.
                            disabled={note.isPending}
                            className="mt-3 w-full resize-y rounded-2xl bg-bg/60 px-4 py-3 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50 disabled:opacity-60"
                        />

                        <FormError error={error} className="mt-3" />
                    </div>
                </div>
            </div>
        </div>
    )
}

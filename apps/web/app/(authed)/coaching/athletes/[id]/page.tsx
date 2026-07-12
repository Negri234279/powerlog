'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useAthleteNote, useMyAthletes, useSetAthleteNote } from '@/lib/graphql/hooks/use-coaching'
import { FormError } from '@/components/ui/form-error'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/** Coach's private-note editor for one athlete. Seeded once, then coach-owned. */
function NoteCard({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const note = useAthleteNote(athleteId)
    const save = useSetAthleteNote(athleteId)

    const [body, setBody] = useState('')
    const [initialized, setInitialized] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    // Seed the textarea once the note has loaded; never clobber later edits.
    useEffect(() => {
        if (!initialized && note.data !== undefined) {
            setBody(note.data?.body ?? '')
            setInitialized(true)
        }
    }, [initialized, note.data])

    const dirty = body !== (note.data?.body ?? '')

    function onSave() {
        setError(null)
        setSaved(false)
        save.mutate(body.trim(), {
            onSuccess: () => setSaved(true),
            onError: (err) => setError(errorMessage(err)),
        })
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <h2 className="font-display text-h3">{t('noteTitle')}</h2>
                <p className="mt-1 text-sm text-text-dim">{t('noteSubtitle')}</p>

                <textarea
                    value={body}
                    onChange={(e) => {
                        setBody(e.target.value)
                        setSaved(false)
                    }}
                    placeholder={t('notePlaceholder')}
                    rows={6}
                    className="mt-4 w-full resize-y rounded-2xl bg-bg/60 px-4 py-3 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50"
                />

                <div className="mt-3 flex items-center gap-3">
                    <TrackedButton
                        analyticsId="athlete-note-save"
                        type="button"
                        onClick={onSave}
                        disabled={!dirty || save.isPending}
                        className="rounded-full bg-white/[0.06] px-5 py-2 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                    >
                        {save.isPending ? t('noteSaving') : t('noteSave')}
                    </TrackedButton>
                    {saved && !dirty ? <span className="text-sm text-pr">{t('noteSaved')}</span> : null}
                </div>

                <FormError error={error} className="mt-3" />
            </div>
        </div>
    )
}

export default function AthleteDetailPage() {
    const t = useTranslations('coaching')
    const { id } = useParams<{ id: string }>()
    const { data: me } = useMe()
    const isCoach = me?.role === 'coach'

    const athletes = useMyAthletes(isCoach)
    const athlete = athletes.data?.find((a) => a.userId === id)

    return (
        <div className="space-y-6">
            <TrackedLink
                analyticsId="athlete-back"
                href="/coaching"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {t('backToCoaching')}
            </TrackedLink>

            <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-lg uppercase text-text ring-1 ring-hairline">
                    {athlete?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={athlete.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                        (athlete?.username ?? '·').slice(0, 2)
                    )}
                </span>
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('athlete')}</p>
                    <h1 className="font-display text-h2 tracking-tight">{athlete ? `@${athlete.username}` : '…'}</h1>
                </div>
            </div>

            {isCoach ? <NoteCard athleteId={id} /> : <p className="text-sm text-text-dim">{t('coachesOnly')}</p>}
        </div>
    )
}

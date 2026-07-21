'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useEffect, useId, useRef, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useInviteAthlete } from '@/lib/graphql/hooks/use-coaching'
import { FormError } from '@/components/ui/form-error'
import { Modal } from '@/components/ui/modal'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * Invite an athlete by email.
 *
 * It stays open after a successful send, with the field cleared and the last
 * invitee confirmed: coaches onboard in batches, and a dialog that closes itself
 * makes the second invite cost three clicks instead of one. Closing is always the
 * coach's decision.
 */
export function InviteAthleteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()
    const invite = useInviteAthlete()
    const titleId = useId()
    const inputRef = useRef<HTMLInputElement>(null)

    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState<string | null>(null)

    // A dialog whose only field isn't focused makes the coach click twice to do
    // the one thing it exists for.
    useEffect(() => {
        if (!open) return

        const focus = requestAnimationFrame(() => inputRef.current?.focus())

        return () => cancelAnimationFrame(focus)
    }, [open])

    function close() {
        setEmail('')
        setError(null)
        setSent(null)
        onClose()
    }

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const value = email.trim()
        if (value === '') return

        setError(null)
        setSent(null)
        
        invite.mutate(value, {
            onSuccess: () => {
                setSent(value)
                setEmail('')
                inputRef.current?.focus()
            },
            onError: (err) => setError(errorMessage(err)),
        })
    }

    return (
        <Modal open={open} onClose={close} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {t('inviteTitle')}
            </h2>
            <p className="mt-2 text-sm text-text-dim">{t('inviteHint')}</p>

            <form onSubmit={onSubmit} className="mt-5">
                <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('inviteEmailPlaceholder')}
                    aria-label={t('inviteTitle')}
                    className="w-full rounded-full bg-bg/60 px-4 py-2.5 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50"
                />

                {sent ? (
                    <p className="mt-3 text-sm text-pr" role="status">
                        {t('inviteSent', { athlete: sent })}
                    </p>
                ) : null}
                <FormError error={error} className="mt-3" />

                <div className="mt-6 flex items-center justify-end gap-2">
                    <TrackedButton
                        analyticsId="coaching-invite-close"
                        type="button"
                        onClick={close}
                        disabled={invite.isPending}
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                    >
                        {sent ? t('done') : t('cancel')}
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="coaching-invite-submit"
                        type="submit"
                        disabled={invite.isPending || email.trim() === ''}
                        className="rounded-full bg-ember-gradient px-5 py-2 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-50"
                    >
                        {t('invite')}
                    </TrackedButton>
                </div>
            </form>
        </Modal>
    )
}

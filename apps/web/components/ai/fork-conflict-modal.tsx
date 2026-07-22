'use client'

import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { draftTitle } from '@/lib/ai/draft-title'
import type { AiDraftSummary } from '@/lib/graphql/hooks/use-ai-history'
import { FormError } from '@/components/ui/form-error'
import { Modal } from '@/components/ui/modal'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * Continuing a conversation supersedes whatever draft is open on the same
 * target — the server does this silently, the way generating a new one already
 * does. Silent is right for the server and wrong for the user, so this is where
 * the consequence gets said out loud, *before* it happens.
 *
 * Three exits, not two: `ConfirmModal` couldn't be reused because the option a
 * user who misread the situation actually wants — go to the draft they already
 * have — is a peer of confirming, not a cancel. Focus lands on Cancel, never on
 * the destructive one.
 */
export function ForkConflictModal({
    open,
    blocking,
    pending,
    error,
    onClose,
    onGoToOpen,
    onConfirm,
}: {
    open: boolean
    /** The draft about to be replaced; named so the user knows what they'd lose. */
    blocking: AiDraftSummary | null
    pending: boolean
    error: string | null
    onClose: () => void
    onGoToOpen: () => void
    onConfirm: () => void
}) {
    const t = useTranslations('aiHistory.fork')
    const tu = useTranslations('aiHistory.untitled')
    const titleId = useId()

    const title = blocking ? draftTitle(blocking) : null
    const blockingLabel = !title ? '' : title.kind === 'none' ? tu(title.of) : title.text

    return (
        <Modal open={open} onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {t('conflictTitle')}
            </h2>
            <p className="mt-2 text-sm text-text-dim">{t('conflictBody')}</p>

            {blockingLabel ? (
                <p className="mt-3 rounded-xl bg-bg/40 px-4 py-3 text-sm text-text ring-1 ring-hairline">
                    “{blockingLabel}”
                </p>
            ) : null}

            {/* The reassurance is what makes replacing safe to choose: it isn't
                deleted, it's in the history the user is standing in. */}
            <p className="mt-3 text-sm text-text-faint">{t('conflictReassurance')}</p>

            <FormError error={error} className="mt-3" />

            <TrackedButton
                analyticsId="ai-draft-fork-goto-open"
                type="button"
                onClick={onGoToOpen}
                disabled={pending}
                className="mt-5 w-full rounded-full px-4 py-2.5 text-sm text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] disabled:opacity-60"
            >
                {t('goToOpen')}
            </TrackedButton>

            <div className="mt-2 flex items-center justify-end gap-2">
                <TrackedButton
                    analyticsId="ai-draft-fork-cancel"
                    type="button"
                    onClick={onClose}
                    disabled={pending}
                    autoFocus
                    className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                >
                    {t('cancel')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="ai-draft-fork-confirm"
                    type="button"
                    onClick={onConfirm}
                    disabled={pending}
                    className="rounded-full bg-ember/10 px-4 py-2 text-sm text-ember ring-1 ring-ember/30 transition-colors duration-300 hover:bg-ember/15 disabled:opacity-60"
                >
                    {pending ? t('continuing') : t('replaceAndContinue')}
                </TrackedButton>
            </div>
        </Modal>
    )
}

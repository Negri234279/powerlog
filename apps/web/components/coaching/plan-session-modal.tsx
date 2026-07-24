'use client'

import { useTranslations } from 'next-intl'

import { PlanSessionForm } from '@/components/coaching/plan-session-form'
import { Modal } from '@/components/ui/modal'

/** The Plan section's session form, reachable from anywhere in the athlete shell. */
export function PlanSessionModal({
    athleteId,
    open,
    onClose,
}: {
    athleteId: string
    open: boolean
    onClose: () => void
}) {
    const t = useTranslations('coaching')

    return (
        <Modal open={open} onClose={onClose} labelledBy="plan-session-title" widthClassName="max-w-lg">
            <h2 id="plan-session-title" className="font-display text-h3 tracking-tight">
                {t('planSessionTitle')}
            </h2>
            <p className="mt-1 mb-5 text-sm text-text-dim">{t('planSessionSubtitle')}</p>

            <PlanSessionForm athleteId={athleteId} analyticsId="athlete-quick-plan-session" />
        </Modal>
    )
}

'use client'

import { useTranslations } from 'next-intl'

import type { RosterRow } from './use-roster'

/** The ember/amber accent a flagged row carries, or none. */
export type AttentionTone = 'none' | 'urgent' | 'warning'

/**
 * Why a row is flagged, in words — used visibly on mobile cards and `sr-only` in
 * the table, so the reason never rides on colour alone.
 */
export function useAttentionReason(): (row: RosterRow) => { reason: string | null; tone: AttentionTone } {
    const t = useTranslations('coaching.roster')

    return (row) => {
        switch (row.metrics?.attention) {
            case 'stale':
                return { reason: t('reasonStale', { days: row.metrics.daysSinceLastSession ?? 0 }), tone: 'urgent' }
            case 'neverTrained':
                return { reason: t('reasonNeverTrained'), tone: 'urgent' }
            case 'lowAdherence':
                return { reason: t('reasonMissed', { count: row.metrics.plannedMissed }), tone: 'warning' }
            default:
                return { reason: null, tone: 'none' }
        }
    }
}

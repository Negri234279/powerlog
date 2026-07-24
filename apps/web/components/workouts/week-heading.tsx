'use client'

import { useTranslations } from 'next-intl'

import { formatWeight, type Units } from '@/lib/units'

/**
 * Divider between weeks in a session history: the range, plus what was actually
 * done in it.
 *
 * A month — let alone six — is a wall of rows with no landmarks. Weeks are the
 * unit lifters and coaches already think in, and carrying the count and volume
 * on the divider is what makes it information rather than decoration: adherence
 * reads at a glance without opening a single session.
 */
export function WeekHeading({
    label,
    sessions,
    volumeKg,
    units,
}: {
    label: string
    sessions: number
    volumeKg: number
    units: Units
}) {
    const t = useTranslations('workouts')

    return (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">{label}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest tabular-nums text-text-faint">
                {t('weekSummary', { count: sessions, volume: formatWeight(volumeKg, units) })}
            </p>
        </div>
    )
}

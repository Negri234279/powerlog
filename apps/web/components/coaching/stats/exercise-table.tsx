import { useTranslations } from 'next-intl'

import type { AthleteStatsRow } from '@/lib/graphql/hooks/use-athlete'
import { formatWeight, type Units } from '@/lib/units'

/**
 * Per-exercise breakdown. Successes and failures sit immediately after the
 * exercise name, not at the far right: on a phone this table scrolls
 * horizontally, and "where are they missing" is the question the coach came
 * with — it must be answerable before scrolling.
 *
 * The glyph headers carry real text for screen readers; a bare ✓ column is the
 * classic way to make a table unreadable without sight.
 */
export function ExerciseTable({ rows, units }: { rows: readonly AthleteStatsRow[]; units: Units }) {
    const t = useTranslations('coaching.athleteStats')
    const ts = useTranslations('stats')

    return (
        <div className="overflow-x-auto rounded-2xl bg-bg/40 ring-1 ring-hairline">
            <table className="w-full min-w-[42rem] text-sm">
                <thead>
                    <tr className="border-b border-hairline text-left font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        <th scope="col" className="px-5 py-3 font-normal">
                            {ts('colExercise')}
                        </th>
                        <th scope="col" className="px-3 py-3 text-right font-normal">
                            <span aria-hidden>✓</span>
                            <span className="sr-only">{t('colSuccess')}</span>
                        </th>
                        <th scope="col" className="px-3 py-3 text-right font-normal">
                            <span aria-hidden>✗</span>
                            <span className="sr-only">{t('colFailed')}</span>
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-normal">
                            {ts('colVolume')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-normal">
                            {ts('colSets')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-normal">
                            {ts('colBestE1rm')}
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-normal">
                            {ts('colHeaviest')}
                        </th>
                    </tr>
                </thead>
                <tbody className="tabular-nums">
                    {rows.map((row) => (
                        <tr key={row.exerciseId} className="border-b border-hairline/60 last:border-0">
                            <td className="px-5 py-3 text-text">{row.name}</td>
                            <td className="px-3 py-3 text-right text-text-dim">{row.successSets}</td>
                            {/* Only tint a real miss — a zero column of ember would
                                make every exercise look like a problem. */}
                            <td
                                className={`px-3 py-3 text-right ${row.failedSets > 0 ? 'text-ember' : 'text-text-faint'}`}
                            >
                                {row.failedSets}
                            </td>
                            <td className="px-5 py-3 text-right text-text">{formatWeight(row.totalVolumeKg, units)}</td>
                            <td className="px-5 py-3 text-right text-text-dim">{row.totalSets}</td>
                            <td className="px-5 py-3 text-right text-text-dim">
                                {formatWeight(row.bestE1rmKg, units)}
                            </td>
                            <td className="px-5 py-3 text-right text-text-dim">
                                {formatWeight(row.heaviestWeightKg, units)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

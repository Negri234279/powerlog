'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'

import { AdherenceCell, LastSessionCell, NextSessionCell } from './roster-cells'
import { RosterIdentity } from './roster-identity'
import { useAttentionReason } from './use-attention-reason'
import type { RosterRow } from './use-roster'

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
            <div className="mt-0.5 text-sm">{children}</div>
        </div>
    )
}

/**
 * The roster below `md`.
 *
 * Volume is dropped on purpose: it's the least actionable of the four and the
 * only one a coach never acts on straight from a roster. Three metrics fit at
 * 360px with Spanish labels; four don't without truncating. What the card gains
 * instead is the attention reason **in words**, which on a phone is worth more
 * than a fourth number.
 */
export function RosterCards({ rows }: { rows: readonly RosterRow[] }) {
    const t = useTranslations('coaching.roster')
    const attentionOf = useAttentionReason()

    return (
        <ul className="space-y-3 md:hidden">
            {rows.map((row) => {
                const { reason, tone } = attentionOf(row)

                return (
                    <li
                        key={row.user.userId}
                        className={cn(
                            'relative overflow-hidden rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline',
                            'has-[a:focus-visible]:ring-ember/50',
                            tone !== 'none' &&
                                `before:absolute before:inset-y-0 before:left-0 before:w-[2px] ${
                                    tone === 'urgent' ? 'before:bg-ember' : 'before:bg-amber'
                                }`,
                        )}
                    >
                        {/* Visible here, sr-only in the table — same string either way. */}
                        <RosterIdentity row={row} reason={null} />

                        {reason ? (
                            <p className={cn('mt-3 text-xs', tone === 'urgent' ? 'text-ember' : 'text-amber')}>
                                {reason}
                            </p>
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                            <Cell label={t('colLast')}>
                                <LastSessionCell row={row} />
                            </Cell>
                            <Cell label={t('colAdherence')}>
                                <AdherenceCell row={row} />
                            </Cell>
                            <Cell label={t('colNext')}>
                                <NextSessionCell row={row} />
                            </Cell>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

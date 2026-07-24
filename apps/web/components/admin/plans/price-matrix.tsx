'use client'

import { useTranslations } from 'next-intl'
import { Fragment } from 'react'

import { Input } from '@/components/ui/field'
import { CURRENCIES, INTERVALS } from './shared'

/** The editable interval × currency price grid (major units). Purely presentational. */
export function PriceMatrix({
    draft,
    onChange,
}: {
    draft: Record<string, string>
    onChange: (key: string, value: string) => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="overflow-x-auto">
            <div className="grid min-w-[19rem] grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
                <span />
                {CURRENCIES.map((currency) => (
                    <span key={currency} className="px-1 text-center font-mono text-eyebrow uppercase text-text-dim">
                        {currency}
                    </span>
                ))}

                {INTERVALS.map((interval) => (
                    <Fragment key={interval}>
                        <span className="font-mono text-eyebrow uppercase text-text-faint">
                            {t(`interval.${interval}` as 'interval.month')}
                        </span>
                        {CURRENCIES.map((currency) => {
                            const key = `${interval}-${currency}`

                            return (
                                <Input
                                    key={currency}
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    inputMode="decimal"
                                    placeholder="—"
                                    aria-label={`${t(`interval.${interval}` as 'interval.month')} ${currency}`}
                                    value={draft[key] ?? ''}
                                    onChange={(event) => onChange(key, event.target.value)}
                                    className="px-3 py-2 text-center text-sm"
                                />
                            )
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

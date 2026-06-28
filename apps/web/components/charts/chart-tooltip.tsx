'use client'

import type { ValueFormatter } from './chart-theme'

interface TooltipEntry {
    name?: string
    value?: number | string
    color?: string
    dataKey?: string | number
}

/**
 * Surface-styled tooltip shared by every chart. Recharts injects `active`,
 * `payload` and `label`; we render a compact card in the design language.
 */
export function ChartTooltip({
    active,
    payload,
    label,
    formatValue,
    formatLabel,
}: {
    active?: boolean
    payload?: TooltipEntry[]
    label?: string | number
    formatValue?: ValueFormatter
    formatLabel?: (label: string | number) => string
}) {
    if (!active || !payload || payload.length === 0) return null

    return (
        <div className="rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-lg ring-1 ring-hairline backdrop-blur">
            {label !== undefined ? (
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    {formatLabel ? formatLabel(label) : label}
                </p>
            ) : null}
            <ul className="space-y-0.5">
                {payload.map((entry, i) => (
                    <li key={i} className="flex items-center gap-2 tabular-nums text-text">
                        <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name ? <span className="text-text-dim">{entry.name}</span> : null}
                        <span className="ml-auto font-mono">
                            {typeof entry.value === 'number' && formatValue ? formatValue(entry.value) : entry.value}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

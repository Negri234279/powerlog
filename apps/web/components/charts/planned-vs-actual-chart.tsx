'use client'

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART, type ValueFormatter } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

export interface PlannedVsActualBucket {
    bucketStart: string
    plannedLoadKg: number
    actualLoadKg: number
}

function weekLabel(t: string | number): string {
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function compact(v: number): string {
    return v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))
}

/**
 * Programmed load against executed load, week by week.
 *
 * Two overlaid areas rather than one compliance line: the gap between them is
 * the reading, and its *direction* matters — a single percentage can't tell an
 * athlete who quietly undershoots every week from one who compensates a light
 * week with a heroic one, and those are opposite programming problems.
 *
 * Programmed is drawn behind as a faint band (the prescription); executed sits
 * on top in ember (what actually happened).
 */
export function PlannedVsActualChart({
    data,
    formatValue,
    plannedName,
    actualName,
    weekOfLabel = (d: string) => `Week of ${d}`,
}: {
    data: PlannedVsActualBucket[]
    formatValue: ValueFormatter
    plannedName: string
    actualName: string
    weekOfLabel?: (formattedDate: string) => string
}) {
    return (
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                        dataKey="bucketStart"
                        tickFormatter={weekLabel}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: CHART.grid }}
                        minTickGap={24}
                    />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
                    <Tooltip
                        content={
                            <ChartTooltip formatValue={formatValue} formatLabel={(l) => weekOfLabel(weekLabel(l))} />
                        }
                        cursor={{ stroke: CHART.grid }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-dim)' }} />
                    <Area
                        name={plannedName}
                        dataKey="plannedLoadKg"
                        stroke={CHART.dim}
                        strokeDasharray="4 3"
                        fill={CHART.dim}
                        fillOpacity={0.08}
                        isAnimationActive={false}
                    />
                    <Area
                        name={actualName}
                        dataKey="actualLoadKg"
                        stroke={CHART.ember}
                        fill={CHART.ember}
                        fillOpacity={0.18}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

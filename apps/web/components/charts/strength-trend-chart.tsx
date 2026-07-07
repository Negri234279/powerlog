'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART, type ValueFormatter } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export interface StrengthPoint {
    performedAt: string
    e1rmKg: number
}

export interface StrengthTrend {
    slopePerWeekKg: number
    r2: number
    projections: { weeks: number; e1rmKg: number }[]
}

interface Row {
    t: number
    actual?: number
    projected?: number
}

function shortDate(t: string | number): string {
    return new Date(Number(t)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * e1RM over time (solid ember) with a dashed projection (amber) extending from
 * the last session through the 4/8/12-week forecast. X axis is real time so the
 * gap before the forecast reads honestly.
 */
export function StrengthTrendChart({
    points,
    trend,
    formatValue,
    projectedLabel = 'Projected',
}: {
    points: StrengthPoint[]
    trend: StrengthTrend | null
    formatValue: ValueFormatter
    projectedLabel?: string
}) {
    const byT = new Map<number, Row>()
    for (const p of points) {
        const t = new Date(p.performedAt).getTime()
        byT.set(t, { ...byT.get(t), t, actual: p.e1rmKg })
    }

    if (trend && points.length > 0) {
        const last = points[points.length - 1]!
        const lastT = new Date(last.performedAt).getTime()
        // Anchor the dashed line on the last real point so the two lines meet.
        byT.set(lastT, { ...byT.get(lastT), t: lastT, projected: last.e1rmKg })
        for (const pr of trend.projections) {
            const t = lastT + pr.weeks * MS_PER_WEEK
            byT.set(t, { ...byT.get(t), t, projected: pr.e1rmKg })
        }
    }

    const data = [...byT.values()].sort((a, b) => a.t - b.t)

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                        dataKey="t"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={shortDate}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: CHART.grid }}
                        minTickGap={32}
                    />
                    <YAxis
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        domain={['auto', 'auto']}
                        tickFormatter={(v: number) => String(Math.round(v))}
                    />
                    <Tooltip
                        content={<ChartTooltip formatValue={formatValue} formatLabel={shortDate} />}
                        cursor={{ stroke: CHART.grid }}
                    />
                    <Line
                        name="e1RM"
                        type="monotone"
                        dataKey="actual"
                        stroke={CHART.ember}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: CHART.ember, strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        isAnimationActive={false}
                    />
                    <Line
                        name={projectedLabel}
                        type="monotone"
                        dataKey="projected"
                        stroke={CHART.amber}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

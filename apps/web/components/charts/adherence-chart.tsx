'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

export interface AdherenceBucket {
    bucketStart: string
    plannedCompleted: number
    plannedMissed: number
}

function weekLabel(t: string | number): string {
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Programmed sessions per week, stacked done-over-missed.
 *
 * Stacked rather than two side-by-side series because the bar height is then the
 * week's whole prescription, and the ember portion reads directly as the share
 * that didn't happen. It's the chart that separates "slipped for a fortnight"
 * from "misses one every week" — two athletes who share an adherence percentage
 * and need opposite conversations.
 */
export function AdherenceChart({
    data,
    doneName,
    missedName,
    weekOfLabel = (d: string) => `Week of ${d}`,
}: {
    data: AdherenceBucket[]
    doneName: string
    missedName: string
    weekOfLabel?: (formattedDate: string) => string
}) {
    return (
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                        dataKey="bucketStart"
                        tickFormatter={weekLabel}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: CHART.grid }}
                        minTickGap={24}
                    />
                    {/* Sessions are whole numbers — a "2.5 sessions" gridline is noise. */}
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip
                        content={<ChartTooltip formatLabel={(l) => weekOfLabel(weekLabel(l))} />}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-dim)' }} />
                    <Bar
                        name={doneName}
                        dataKey="plannedCompleted"
                        stackId="sessions"
                        fill={CHART.pr}
                        isAnimationActive={false}
                    />
                    <Bar
                        name={missedName}
                        dataKey="plannedMissed"
                        stackId="sessions"
                        fill={CHART.ember}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

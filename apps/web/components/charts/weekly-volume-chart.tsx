'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART, type ValueFormatter } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

export interface VolumeBucket {
    bucketStart: string
    totalVolumeKg: number
    totalSets: number
    sessions: number
}

function weekLabel(t: string | number): string {
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function compact(v: number): string {
    return v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))
}

/** Weekly tonnage as bars; the tooltip adds the set count for context. */
export function WeeklyVolumeChart({ data, formatValue }: { data: VolumeBucket[]; formatValue: ValueFormatter }) {
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
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={compact} />
                    <Tooltip
                        content={
                            <ChartTooltip formatValue={formatValue} formatLabel={(l) => `Week of ${weekLabel(l)}`} />
                        }
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar
                        name="Volume"
                        dataKey="totalVolumeKg"
                        fill={CHART.ember}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

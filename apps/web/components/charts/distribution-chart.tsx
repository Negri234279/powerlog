'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART, type ValueFormatter } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

export interface DistributionSlice {
    key: string
    totalVolumeKg: number
    totalSets: number
}

function compact(v: number): string {
    return v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))
}

/**
 * Horizontal volume distribution over a categorical key (muscle / movement).
 * Bars fade ember → soft to read as a ranked emphasis list.
 */
export function DistributionChart({
    data,
    formatValue,
    seriesName = 'Volume',
    labelFor = (key: string) => key,
}: {
    data: DistributionSlice[]
    formatValue: ValueFormatter
    seriesName?: string
    labelFor?: (key: string) => string
}) {
    if (data.length === 0) return null
    const rows = data.map((d) => ({ label: labelFor(d.key), value: d.totalVolumeKg, sets: d.totalSets }))
    const height = rows.length * 34 + 16

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide tickFormatter={compact} />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        width={84}
                    />
                    <Tooltip
                        content={<ChartTooltip formatValue={formatValue} />}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar name={seriesName} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
                        {rows.map((_, i) => (
                            <Cell
                                key={i}
                                fill={i === 0 ? CHART.ember : CHART.emberSoft}
                                fillOpacity={i === 0 ? 1 : 0.55}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

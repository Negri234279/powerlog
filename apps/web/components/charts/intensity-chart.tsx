'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { axisTick, CHART } from './chart-theme'
import { ChartTooltip } from './chart-tooltip'

export interface IntensityBucket {
    value: number
    sets: number
}

/**
 * Sets per intensity value (RPE or RIR). `label` prefixes ticks/tooltip and
 * `intense` decides which bars glow ember — RPE is hard when high, RIR when low.
 */
export function IntensityChart({
    data,
    label,
    intense,
    seriesName = 'Sets',
}: {
    data: IntensityBucket[]
    label: string
    intense: (value: number) => boolean
    seriesName?: string
}) {
    if (data.length === 0) return null

    return (
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <XAxis
                        dataKey="value"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: CHART.grid }}
                        tickFormatter={(v: number) => `${label} ${v}`}
                    />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <Tooltip
                        content={<ChartTooltip formatLabel={(l) => `${label} ${l}`} />}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar
                        name={seriesName}
                        dataKey="sets"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                        isAnimationActive={false}
                    >
                        {data.map((d, i) => (
                            <Cell
                                key={i}
                                fill={intense(d.value) ? CHART.ember : CHART.emberSoft}
                                fillOpacity={intense(d.value) ? 1 : 0.5}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

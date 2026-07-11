'use client'

import { useTranslations } from 'next-intl'

import { Skeleton } from '@/components/ui/skeleton'
import { type AiProvider, useMyAiUsage } from '@/lib/graphql/hooks/use-ai-settings'

const DASH = '—'
const tokenFormat = new Intl.NumberFormat('en-US')
const moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
})

const money = (value: number | null): string => (value === null ? DASH : moneyFormat.format(value))

const price = (input: number | null, output: number | null): string =>
    input === null || output === null ? DASH : `$${input} / $${output}`

/**
 * The user's own AI spend, metered per completion and rolled up per model.
 * Cost is an estimate — the providers don't expose prices (or balance) over the
 * API, so it's tokens × a static rate table. Unknown-price models show "—".
 */
export function AiUsageTable() {
    const t = useTranslations('ai')
    const { data, isLoading, isError } = useMyAiUsage()

    return (
        <section>
            <h2 className="font-mono text-eyebrow uppercase text-text-dim">{t('usageTitle')}</h2>
            <p className="mt-2 max-w-lg text-sm text-text-dim">{t('usageIntro')}</p>

            <div className="mt-4 rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                <div className="inset-hi overflow-x-auto rounded-[calc(2rem-0.375rem)] bg-surface">
                    {isLoading ? (
                        <Skeleton className="m-2 h-40 rounded-3xl" />
                    ) : isError ? (
                        <p className="p-6 text-sm text-ember">{t('usageError')}</p>
                    ) : !data || data.rows.length === 0 ? (
                        <p className="p-6 text-sm text-text-dim">{t('usageEmpty')}</p>
                    ) : (
                        <table className="w-full min-w-[40rem] border-collapse text-sm">
                            <thead>
                                <tr className="text-left font-mono text-eyebrow uppercase text-text-faint">
                                    <th className="px-4 py-3 font-normal">{t('usageProvider')}</th>
                                    <th className="px-4 py-3 font-normal">{t('usageModel')}</th>
                                    <th className="px-4 py-3 text-right font-normal">{t('usagePrice')}</th>
                                    <th className="px-4 py-3 text-right font-normal">{t('usageTokens')}</th>
                                    <th className="px-4 py-3 text-right font-normal">{t('usageRequests')}</th>
                                    <th className="px-4 py-3 text-right font-normal">{t('usageCost')}</th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums">
                                {data.rows.map((row) => (
                                    <tr key={`${row.provider}:${row.model}`} className="border-t border-hairline">
                                        <td className="px-4 py-3 text-text-dim">
                                            {t(`providers.${row.provider as AiProvider}.name`)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-text">{row.model}</td>
                                        <td className="px-4 py-3 text-right text-text-dim">
                                            {price(row.inputPricePerMTok, row.outputPricePerMTok)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-text-dim">
                                            {tokenFormat.format(row.inputTokens)} /{' '}
                                            {tokenFormat.format(row.outputTokens)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-text-dim">
                                            {tokenFormat.format(row.requests)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-text">{money(row.totalCost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-hairline font-mono text-eyebrow uppercase tabular-nums text-text-dim">
                                    <td className="px-4 py-3" colSpan={3}>
                                        {t('usageTotal')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {tokenFormat.format(data.totals.inputTokens)} /{' '}
                                        {tokenFormat.format(data.totals.outputTokens)}
                                    </td>
                                    <td className="px-4 py-3 text-right">{tokenFormat.format(data.totals.requests)}</td>
                                    <td className="px-4 py-3 text-right text-text">{money(data.totals.totalCost)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </section>
    )
}

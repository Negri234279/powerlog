'use client'

import { useTranslations } from 'next-intl'

import { Field, Input, Textarea } from '@/components/ui/field'
import type { OfferDraft } from './shared'

/** The offer form fields — presentational; state lives in the parent (create draft or edit panel). */
export function OfferFields({
    value,
    onChange,
}: {
    value: OfferDraft
    onChange: (patch: Partial<OfferDraft>) => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="space-y-4">
            <Field label={t('offerName')} hint={t('offerNameHint')}>
                <Input
                    value={value.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    required
                    maxLength={60}
                />
            </Field>

            <Field label={t('offerMessage')} hint={t('offerMessageHint')}>
                <Textarea
                    value={value.message}
                    onChange={(event) => onChange({ message: event.target.value })}
                    maxLength={120}
                    placeholder={t('offerMessagePlaceholder')}
                />
            </Field>

            <Field label={t('offerTrialDays')} hint={t('offerTrialDaysHint')}>
                <Input
                    type="number"
                    min="1"
                    max="365"
                    inputMode="numeric"
                    placeholder="—"
                    value={value.trialDays}
                    onChange={(event) => onChange({ trialDays: event.target.value })}
                />
            </Field>

            <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                <p className="font-mono text-eyebrow uppercase text-text-dim">{t('offerDiscountTitle')}</p>
                <p className="mt-1 text-xs text-text-faint">{t('offerDiscountHint')}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label={t('offerDiscountPercent')}>
                        <Input
                            type="number"
                            min="1"
                            max="100"
                            inputMode="numeric"
                            placeholder="—"
                            value={value.percentOff}
                            onChange={(event) => onChange({ percentOff: event.target.value })}
                        />
                    </Field>
                    <Field label={t('offerDiscountCycles')}>
                        <Input
                            type="number"
                            min="1"
                            max="36"
                            inputMode="numeric"
                            placeholder="—"
                            value={value.cycles}
                            onChange={(event) => onChange({ cycles: event.target.value })}
                        />
                    </Field>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label={t('offerStartsAt')} hint={t('offerStartsAtHint')}>
                    <Input
                        type="date"
                        value={value.startsAt}
                        onChange={(event) => onChange({ startsAt: event.target.value })}
                    />
                </Field>
                <Field label={t('offerEndsAt')} hint={t('offerEndsAtHint')}>
                    <Input
                        type="date"
                        value={value.endsAt}
                        onChange={(event) => onChange({ endsAt: event.target.value })}
                    />
                </Field>
            </div>
        </div>
    )
}

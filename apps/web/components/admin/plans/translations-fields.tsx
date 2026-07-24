'use client'

import { useTranslations } from 'next-intl'

import { Field, Input, Textarea } from '@/components/ui/field'
import { type TranslationDraft, TRANSLATION_LOCALES } from './shared'

/** Name + description per non-default locale. Empty rows fall back to the base. */
export function TranslationsFields({
    value,
    onChange,
}: {
    value: TranslationDraft
    onChange: (locale: string, patch: Partial<{ name: string; description: string }>) => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-faint">{t('planTranslationsHint')}</p>
            {TRANSLATION_LOCALES.map((locale) => (
                <div key={locale} className="space-y-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                    <p className="font-mono text-eyebrow uppercase text-text-faint">
                        {t(`localeName.${locale}` as 'localeName.es')}
                    </p>
                    <Field label={t('planName')}>
                        <Input
                            value={value[locale]?.name ?? ''}
                            onChange={(event) => onChange(locale, { name: event.target.value })}
                            maxLength={60}
                        />
                    </Field>
                    <Field label={t('planDescription')}>
                        <Textarea
                            value={value[locale]?.description ?? ''}
                            onChange={(event) => onChange(locale, { description: event.target.value })}
                            maxLength={500}
                        />
                    </Field>
                </div>
            ))}
        </div>
    )
}

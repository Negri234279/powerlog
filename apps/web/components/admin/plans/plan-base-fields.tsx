'use client'

import { useTranslations } from 'next-intl'
import { useId } from 'react'

import type { EntitlementsJsonSchema } from '@/lib/graphql/hooks/use-admin-billing'
import { type EntitlementsValue, EntitlementsForm } from '@/components/admin/entitlements-form'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'

interface PlanBaseFieldsProps {
    schema?: EntitlementsJsonSchema
    name: string
    setName: (value: string) => void
    nameError?: string
    slug: string
    setSlug: (value: string) => void
    slugError?: string
    showSlug: boolean
    description: string
    setDescription: (value: string) => void
    entitlements: EntitlementsValue
    setEntitlements: (value: EntitlementsValue) => void
    highlighted: boolean
    setHighlighted: (value: boolean) => void
    liveNote: boolean
}

/** The plan's base info: name, (optional) slug, description and the schema-driven grants. */
export function PlanBaseFields({
    schema,
    name,
    setName,
    nameError,
    slug,
    setSlug,
    slugError,
    showSlug,
    description,
    setDescription,
    entitlements,
    setEntitlements,
    highlighted,
    setHighlighted,
    liveNote,
}: PlanBaseFieldsProps) {
    const t = useTranslations('admin')
    const highlightId = useId()

    return (
        <div className="space-y-4">
            <Field label={t('planName')} error={nameError}>
                <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={!!nameError}
                    required
                    maxLength={60}
                />
            </Field>

            {showSlug ? (
                <Field label={t('planSlug')} error={slugError} hint={t('planSlugHint')}>
                    <Input
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        aria-invalid={!!slugError}
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        minLength={3}
                        maxLength={40}
                    />
                </Field>
            ) : null}

            <Field label={t('planDescription')}>
                <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                />
            </Field>

            <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                <div className="flex items-center gap-3">
                    <input
                        id={highlightId}
                        type="checkbox"
                        checked={highlighted}
                        onChange={(event) => setHighlighted(event.target.checked)}
                        className="size-4 accent-ember"
                    />
                    <label htmlFor={highlightId} className="text-sm text-text-dim">
                        {t('planHighlighted')}
                    </label>
                </div>
                <p className="mt-1.5 pl-7 text-xs text-text-faint">{t('planHighlightedHint')}</p>
            </div>

            <div className="space-y-2">
                <p className="font-mono text-eyebrow uppercase text-text-dim">{t('planEntitlements')}</p>
                {schema ? (
                    <EntitlementsForm schema={schema} value={entitlements} onChange={setEntitlements} />
                ) : (
                    <Skeleton className="h-24 rounded-2xl" />
                )}
                {liveNote ? <p className="text-xs text-text-faint">{t('planEntitlementsLive')}</p> : null}
            </div>
        </div>
    )
}

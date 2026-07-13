'use client'

import { useTranslations } from 'next-intl'
import { useId } from 'react'

import type { EntitlementProperty, EntitlementsJsonSchema } from '@/lib/graphql/hooks/use-admin-billing'
import { Input } from '@/components/ui/field'

/**
 * The entitlements editor — **generated from the API's own schema**, not written
 * by hand.
 *
 * The API exposes the zod schema of an audience as JSON Schema, and this walks it:
 * a boolean becomes a checkbox, a nullable integer becomes a number with an
 * "unlimited" switch, a nested object becomes a group. Adding a feature check is
 * therefore one line of zod in the API — no migration, no GraphQL type, and no
 * change in this file.
 *
 * Labels come from the `admin.entitlements.*` messages and fall back to the raw
 * key, so a brand-new feature is editable the moment the API ships it, and only
 * its label is left to translate.
 */
export type EntitlementsValue = Record<string, unknown>

export function EntitlementsForm({
    schema,
    value,
    onChange,
}: {
    schema: EntitlementsJsonSchema
    value: EntitlementsValue
    onChange: (value: EntitlementsValue) => void
}) {
    return (
        <div className="space-y-3">
            {Object.entries(schema.properties).map(([key, property]) => (
                <PropertyField
                    key={key}
                    name={key}
                    property={property}
                    value={value[key]}
                    onChange={(next) => onChange({ ...value, [key]: next })}
                />
            ))}
        </div>
    )
}

function PropertyField({
    name,
    property,
    value,
    onChange,
}: {
    name: string
    property: EntitlementProperty
    value: unknown
    onChange: (value: unknown) => void
}) {
    if (property.type === 'boolean') {
        return <BooleanField name={name} value={value === true} onChange={onChange} />
    }

    // A nullable number: `null` is the unlimited case (today: maxAthletes).
    if (property.anyOf?.some((option) => option.type === 'integer')) {
        return <NullableNumberField name={name} value={(value ?? null) as number | null} onChange={onChange} />
    }

    if (property.type === 'integer' || property.type === 'number') {
        return (
            <NullableNumberField
                name={name}
                value={(value ?? 0) as number}
                onChange={onChange}
                allowUnlimited={false}
            />
        )
    }

    if (property.properties) {
        // A nested section (the coach plan's `athlete` block: what its holder gets
        // for their own training).
        const nested = (value ?? {}) as EntitlementsValue

        return (
            <fieldset className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                <legend className="px-1 font-mono text-eyebrow uppercase text-text-faint">
                    <Label name={name} />
                </legend>
                <div className="mt-2 space-y-3">
                    {Object.entries(property.properties).map(([key, child]) => (
                        <PropertyField
                            key={key}
                            name={key}
                            property={child}
                            value={nested[key]}
                            onChange={(next) => onChange({ ...nested, [key]: next })}
                        />
                    ))}
                </div>
            </fieldset>
        )
    }

    return null
}

function BooleanField({ name, value, onChange }: { name: string; value: boolean; onChange: (value: boolean) => void }) {
    const id = useId()

    return (
        <div className="flex items-center gap-3">
            <input
                id={id}
                type="checkbox"
                checked={value}
                onChange={(event) => onChange(event.target.checked)}
                className="size-4 accent-ember"
            />
            <label htmlFor={id} className="text-sm text-text-dim">
                <Label name={name} />
            </label>
        </div>
    )
}

function NullableNumberField({
    name,
    value,
    onChange,
    allowUnlimited = true,
}: {
    name: string
    value: number | null
    onChange: (value: number | null) => void
    allowUnlimited?: boolean
}) {
    const t = useTranslations('admin')
    const id = useId()
    const unlimited = value === null

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block font-mono text-eyebrow uppercase text-text-dim">
                <Label name={name} />
            </label>
            <div className="flex items-center gap-3">
                <Input
                    id={id}
                    type="number"
                    min={0}
                    value={unlimited ? '' : String(value ?? 0)}
                    disabled={unlimited}
                    onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
                    className="max-w-32 disabled:opacity-40"
                />
                {allowUnlimited ? (
                    <label className="flex items-center gap-2 text-sm text-text-dim">
                        <input
                            type="checkbox"
                            checked={unlimited}
                            onChange={(event) => onChange(event.target.checked ? null : 0)}
                            className="size-4 accent-ember"
                        />
                        {t('entitlementUnlimited')}
                    </label>
                ) : null}
            </div>
        </div>
    )
}

/** A feature's label, falling back to its key so a new one is usable before it is translated. */
function Label({ name }: { name: string }) {
    const t = useTranslations('admin.entitlements')
    const key = name as Parameters<typeof t>[0]
    const translated = t.has(key) ? t(key) : name

    return <>{translated}</>
}

/** The value a fresh form starts from: everything off, numbers at zero. */
export function emptyEntitlements(schema: EntitlementsJsonSchema): EntitlementsValue {
    const value: EntitlementsValue = {}

    for (const [key, property] of Object.entries(schema.properties)) {
        if (property.type === 'boolean') value[key] = false
        else if (property.anyOf?.some((option) => option.type === 'integer')) value[key] = 0
        else if (property.type === 'integer' || property.type === 'number') value[key] = 0
        else if (property.properties) value[key] = emptyEntitlements(property as EntitlementsJsonSchema)
    }

    return value
}

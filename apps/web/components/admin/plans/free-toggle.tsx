'use client'

import { useTranslations } from 'next-intl'
import { useId } from 'react'

/**
 * "This plan has no prices" confirmation. Editable while creating (it sets `isFree`);
 * a plan's free status is fixed at birth, so it shows locked when editing.
 */
export function FreeToggle({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
}) {
    const t = useTranslations('admin')
    const id = useId()

    return (
        <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
            <div className="flex items-center gap-3">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onChange?.(event.target.checked)}
                    className="size-4 accent-ember disabled:opacity-50"
                />
                <label htmlFor={id} className="text-sm text-text-dim">
                    {t('planFreeConfirm')}
                </label>
            </div>
            {disabled ? <p className="mt-1.5 pl-7 text-xs text-text-faint">{t('planFreeLocked')}</p> : null}
        </div>
    )
}

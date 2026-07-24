'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { cn } from '@/lib/cn'
import { fieldKey, type SetField } from '@/lib/workouts/planned-validation'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Menu, type MenuItem } from '@/components/ui/menu'
import type { DraftSet, IntensityKind } from './template-draft'

const cellClass =
    'w-full rounded-xl bg-bg/60 px-3 py-2 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50'

function CellError({ message }: { message?: string }) {
    if (!message) return null

    return <p className="mt-1 px-1 text-[10px] leading-tight text-ember">{message}</p>
}

/** One programmed set in the template editor: inline weight/reps/intensity cells
 *  plus a ⋮ menu (duplicate / remove) — fields are edited in place, so the menu
 *  never needs an "edit" action. */
export function SetRow({
    set,
    index,
    errors,
    onPatch,
    onRemove,
    onDuplicate,
    onBlurField,
}: {
    set: DraftSet
    index: number
    errors: Record<string, string>
    onPatch: (patch: Partial<DraftSet>) => void
    onRemove: () => void
    onDuplicate: () => void
    onBlurField: (field: SetField) => void
}) {
    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    const weightError = errors[fieldKey(set.key, 'weight')]
    const repsError = errors[fieldKey(set.key, 'reps')]
    const intensityError = errors[fieldKey(set.key, 'intensity')]
    const [confirmingRemove, setConfirmingRemove] = useState(false)

    const menuItems: MenuItem[] = [
        { label: tw('duplicate'), analyticsId: 'template-duplicate-set', onSelect: onDuplicate },
        {
            label: tw('removeSet'),
            analyticsId: 'template-remove-set',
            onSelect: () => setConfirmingRemove(true),
            destructive: true,
        },
    ]

    // items-start so the row number and remove button stay aligned to the inputs
    // even when an error message grows a cell taller.
    return (
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-start gap-2">
            <span className="pt-2 text-right font-mono text-xs text-text-faint">{index}</span>
            {/* Text, not number: a range like `50-55` needs the hyphen the numeric
                keypad hides. `inputMode="decimal"` still brings up digits on mobile. */}
            <div className="min-w-0">
                <input
                    type="text"
                    inputMode="decimal"
                    value={set.weight}
                    onChange={(e) => onPatch({ weight: e.target.value })}
                    onBlur={() => onBlurField('weight')}
                    aria-invalid={weightError ? true : undefined}
                    placeholder={tw('rangePlaceholder')}
                    className={cn(cellClass, weightError && 'ring-ember/60 focus:ring-ember/70')}
                />
                <CellError message={weightError} />
            </div>
            <div className="min-w-0">
                <input
                    type="text"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) => onPatch({ reps: e.target.value })}
                    onBlur={() => onBlurField('reps')}
                    aria-invalid={repsError ? true : undefined}
                    placeholder={tw('rangePlaceholder')}
                    className={cn(cellClass, repsError && 'ring-ember/60 focus:ring-ember/70')}
                />
                <CellError message={repsError} />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                    <select
                        value={set.intensityKind}
                        onChange={(e) => onPatch({ intensityKind: e.target.value as IntensityKind, intensity: '' })}
                        onBlur={() => onBlurField('intensity')}
                        className={cn(cellClass, 'appearance-none')}
                        aria-label={t('intensityType')}
                    >
                        <option value="none">—</option>
                        <option value="rpe">RPE</option>
                        <option value="rir">RIR</option>
                    </select>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={set.intensity}
                        onChange={(e) => onPatch({ intensity: e.target.value })}
                        onBlur={() => onBlurField('intensity')}
                        disabled={set.intensityKind === 'none'}
                        aria-invalid={intensityError ? true : undefined}
                        placeholder={set.intensityKind === 'none' ? '' : '0'}
                        className={cn(
                            cellClass,
                            'w-16 disabled:opacity-40',
                            intensityError && 'ring-ember/60 focus:ring-ember/70',
                        )}
                        aria-label={t('intensityValue')}
                    />
                </div>
                <CellError message={intensityError} />
            </div>
            <Menu analyticsId="template-set-actions" label={tw('setActions')} items={menuItems} />

            <ConfirmModal
                analyticsId="template-set-remove"
                open={confirmingRemove}
                onClose={() => setConfirmingRemove(false)}
                onConfirm={onRemove}
                title={tw('setRemoveTitle', { index })}
                description={tw('setRemoveBody')}
                confirmLabel={tw('removeSet')}
                cancelLabel={tw('cancel')}
                destructive
            />
        </div>
    )
}

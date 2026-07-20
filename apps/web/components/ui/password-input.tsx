'use client'

import { useTranslations } from 'next-intl'
import { type InputHTMLAttributes, useState } from 'react'

import { Input } from '@/components/ui/field'
import { Eye, EyeOff } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/**
 * Password field with a show/hide affordance. Drop-in for `<Input type="password" />`.
 * The toggle is keyboard-reachable, announces its state (`aria-pressed`), and never
 * ships the plaintext in `autoComplete` flows — it only flips the input `type`.
 */
export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    const t = useTranslations('common')
    const [visible, setVisible] = useState(false)

    return (
        <div className="relative">
            <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-12', className)} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? t('hidePassword') : t('showPassword')}
                aria-pressed={visible}
                className="absolute inset-y-1 right-1.5 grid w-9 place-items-center rounded-xl text-text-dim outline-none transition-colors hover:text-text focus-visible:text-text focus-visible:ring-2 focus-visible:ring-ember/50"
            >
                {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
        </div>
    )
}

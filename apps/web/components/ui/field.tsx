import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

const control =
    'w-full rounded-2xl bg-bg/60 px-4 py-3 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 ease-spring placeholder:text-text-faint focus:ring-ember/50 aria-[invalid=true]:ring-ember/60 aria-[invalid=true]:focus:ring-ember/70'

/** Labeled form row with optional hint/error. */
export function Field({
    label,
    htmlFor,
    error,
    hint,
    children,
}: {
    label: string
    htmlFor?: string
    error?: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="block font-mono text-eyebrow uppercase text-text-dim">
                {label}
            </label>
            {children}
            {error ? (
                <p className="text-xs text-ember">{error}</p>
            ) : hint ? (
                <p className="text-xs text-text-faint">{hint}</p>
            ) : null}
        </div>
    )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn(control, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn(control, 'min-h-24 resize-y', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select className={cn(control, 'appearance-none', className)} {...props} />
}

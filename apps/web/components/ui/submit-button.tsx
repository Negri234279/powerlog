import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'
import { TextSwap } from './text-swap'

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean
}

/** Ember pill submit button with a loading state (button element, for forms).
 *  The label swaps in place (text-states-swap) between the idle and loading text. */
export function SubmitButton({ children, loading, disabled, className, ...props }: SubmitButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading || disabled}
            className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-full bg-ember-gradient px-6 py-3',
                'text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring',
                'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        >
            {typeof children === 'string' ? (
                <TextSwap text={loading ? 'Working…' : children} />
            ) : loading ? (
                'Working…'
            ) : (
                children
            )}
        </button>
    )
}

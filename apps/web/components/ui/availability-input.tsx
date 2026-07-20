'use client'

import type { InputHTMLAttributes } from 'react'

import { Input } from '@/components/ui/field'
import { Check, Close, Spinner } from '@/components/ui/icons'
import type { AvailabilityStatus } from '@/lib/graphql/hooks/use-availability'
import { cn } from '@/lib/cn'

/**
 * Text input with a live availability adornment: a spinner while checking, a green
 * check when free, a red cross when taken. The message itself (why it's taken) is
 * the surrounding `Field`'s job — this only carries the at-a-glance status.
 */
export function AvailabilityInput({
    status,
    className,
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { status: AvailabilityStatus }) {
    const icon =
        status === 'checking' ? (
            <Spinner className="size-4 text-text-dim" />
        ) : status === 'available' ? (
            <Check className="size-4 text-pr" />
        ) : status === 'taken' ? (
            <Close className="size-4 text-ember" />
        ) : null

    return (
        <div className="relative">
            <Input
                {...props}
                aria-invalid={status === 'taken' || undefined}
                className={cn(icon && 'pr-11', className)}
            />
            {icon ? (
                <span className="pointer-events-none absolute inset-y-0 right-0 grid w-11 place-items-center">
                    {icon}
                </span>
            ) : null}
        </div>
    )
}

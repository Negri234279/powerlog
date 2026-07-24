'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'

/** Open/closed pill for a support ticket, shared by the inbox and the detail. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
    const t = useTranslations('admin.support')
    const open = status === 'open'

    return (
        <span
            className={cn(
                'shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
                open ? 'bg-amber/10 text-amber' : 'bg-white/[0.05] text-text-faint',
                className,
            )}
        >
            {t(`status.${status}` as 'status.open')}
        </span>
    )
}

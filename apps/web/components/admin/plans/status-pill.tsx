'use client'

import { useTranslations } from 'next-intl'

/** The plan's lifecycle status as a coloured pill (draft / active / archived). */
export function StatusPill({ status }: { status: string }) {
    const t = useTranslations('admin')
    const tone =
        status === 'active'
            ? 'bg-ember/15 text-ember'
            : status === 'archived'
              ? 'bg-white/[0.04] text-text-faint'
              : 'bg-white/[0.06] text-text-dim'

    return (
        <span className={`rounded-full px-2 py-0.5 font-mono text-eyebrow uppercase ${tone}`}>
            {t(`planStatusValue.${status}` as 'planStatusValue.draft')}
        </span>
    )
}

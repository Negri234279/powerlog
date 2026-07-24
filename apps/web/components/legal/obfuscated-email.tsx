'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { track } from '@/lib/analytics/events'
import { CONTACT_EMAIL } from '@/lib/contact'

/**
 * A `mailto:` link whose address is assembled in the browser from reversed halves
 * (see `lib/contact.ts`). Until hydration runs — and for JS-less clients, including
 * most email harvesters — it renders a neutral fallback label, never the address.
 */
export function ObfuscatedEmail({
    analyticsId = 'legal-contact-email',
    className,
}: {
    analyticsId?: string
    className?: string
}) {
    const t = useTranslations('legal')
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        const rev = (s: string) => [...s].reverse().join('')
        setEmail(`${rev(CONTACT_EMAIL.userReversed)}@${rev(CONTACT_EMAIL.domainReversed)}`)
    }, [])

    const linkClass =
        className ?? 'text-text underline decoration-text-faint underline-offset-2 transition-colors hover:text-ember'

    if (!email) return <span className="text-text-dim">{t('emailFallback')}</span>

    return (
        <a
            href={`mailto:${email}`}
            className={linkClass}
            onClick={() => track('ui_click', { id: analyticsId, kind: 'link' })}
        >
            {email}
        </a>
    )
}

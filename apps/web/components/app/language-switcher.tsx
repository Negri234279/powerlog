'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { cn } from '@/lib/cn'
import { refreshSession } from '@/lib/graphql/client'
import { useUpdateProfile } from '@/lib/graphql/hooks/use-profile'
import { setLocaleCookie } from '@/lib/i18n/actions'
import { type Locale, SUPPORTED_LOCALES } from '@/lib/i18n/config'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * EN | ES segmented toggle. Switching sets the `NEXT_LOCALE` cookie (so the UI
 * changes immediately) and, when `persist` (signed-in shell), also saves the
 * choice to the DB profile and rotates the access token — so exercise names,
 * which localize from the token's locale claim, follow without a delay.
 */
export function LanguageSwitcher({ persist = true, className }: { persist?: boolean; className?: string }) {
    const locale = useLocale() as Locale
    const t = useTranslations('shell')
    const router = useRouter()
    const updateProfile = useUpdateProfile()
    const [pending, startTransition] = useTransition()

    function choose(next: Locale) {
        if (next === locale || pending) return
        startTransition(async () => {
            await setLocaleCookie(next)
            if (persist) {
                try {
                    await updateProfile.mutateAsync({ locale: next })
                    // Re-mint the JWT so its locale claim (and thus localized
                    // exercise names) matches the new UI language right away.
                    await refreshSession().catch(() => undefined)
                } catch {
                    /* the cookie already switched the UI; DB sync is best-effort */
                }
            }
            router.refresh()
        })
    }

    return (
        <div
            role="group"
            aria-label={t('language')}
            className={cn('inline-flex items-center gap-0.5 rounded-full p-0.5 ring-1 ring-hairline', className)}
        >
            {SUPPORTED_LOCALES.map((option) => (
                <TrackedButton
                    key={option}
                    analyticsId={`shell-lang-${option}`}
                    type="button"
                    onClick={() => choose(option)}
                    aria-pressed={option === locale}
                    disabled={pending}
                    className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors duration-300 disabled:opacity-60',
                        option === locale ? 'bg-white/[0.08] text-text' : 'text-text-dim hover:text-text',
                    )}
                >
                    {option}
                </TrackedButton>
            ))}
        </div>
    )
}

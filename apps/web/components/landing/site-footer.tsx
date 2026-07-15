import { getTranslations } from 'next-intl/server'

import { Mark } from '@/components/ui/icons'
import { TrackedLink } from '@/components/ui/tracked'
import { LocaleSwitcher } from './locale-switcher'

// Stable ids drive the analytics event and the message key; the visible label is
// translated. Keeping the id separate from the label is what lets the copy change
// per locale without moving the `footer-*` click events.
const COLUMNS = [
    { id: 'product', titleKey: 'colProduct', items: ['features', 'analytics', 'coaching', 'pricing'] },
    { id: 'company', titleKey: 'colCompany', items: ['about', 'changelog', 'careers', 'contact'] },
    { id: 'legal', titleKey: 'colLegal', items: ['privacy', 'terms', 'security'] },
] as const

export async function SiteFooter() {
    const t = await getTranslations('landing.footer')

    return (
        <footer className="border-t border-hairline px-6 py-16 md:px-8">
            <div className="mx-auto grid max-w-[80rem] gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                            <Mark className="size-4.5" />
                        </span>
                        <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
                    </div>
                    <p className="mt-4 max-w-xs text-body text-text-dim">{t('tagline')}</p>
                </div>

                {COLUMNS.map((col) => (
                    <div key={col.id}>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{t(col.titleKey)}</p>
                        <ul className="mt-4 space-y-3">
                            {col.items.map((item) => (
                                <li key={item}>
                                    <TrackedLink
                                        analyticsId={`footer-${item}`}
                                        href="#"
                                        className="text-body text-text-dim transition-colors hover:text-text"
                                    >
                                        {t(`${col.id}.${item}`)}
                                    </TrackedLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mx-auto mt-14 flex max-w-[80rem] flex-col items-center justify-between gap-3 border-t border-hairline pt-8 font-mono text-eyebrow uppercase text-text-faint md:flex-row">
                <span>© {new Date().getFullYear()} powerlog</span>
                <LocaleSwitcher />
                <span>{t('builtForBar')}</span>
            </div>
        </footer>
    )
}

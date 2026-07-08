import { useTranslations } from 'next-intl'

import { ProfileNav } from '@/components/profile/profile-nav'
import { TextsReveal } from '@/components/ui/texts-reveal'

/** Account area shell: a persistent header + horizontal sub-nav that stays put
 *  while the section (Profile / Security) swaps underneath via nested routes. */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('profile')

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-3 font-display text-display">{t('heading')}</h1>
            </TextsReveal>

            <div className="mt-6">
                <ProfileNav />
            </div>

            <div className="mt-8">{children}</div>
        </div>
    )
}

import { getTranslations } from 'next-intl/server'

import { PrimaryCta, SecondaryCta } from '@/components/ui/cta'
import { Reveal } from '@/components/ui/reveal'

export async function CtaSection() {
    const t = await getTranslations('landing.cta')

    return (
        <section className="relative px-6 py-24 md:px-8 md:py-32">
            <div className="mx-auto max-w-[80rem]">
                <Reveal>
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-shell p-1.5 ring-1 ring-hairline">
                        <div className="inset-hi relative overflow-hidden rounded-[calc(2.5rem-0.375rem)] bg-surface px-8 py-20 text-center md:px-16 md:py-28">
                            <div className="orb left-1/2 top-0 size-[420px] -translate-x-1/2 bg-ember opacity-25" />
                            <h2 className="relative mx-auto max-w-3xl font-display text-display">
                                {t.rich('title', {
                                    em: (chunks) => <span className="text-gradient-ember">{chunks}</span>,
                                })}
                            </h2>
                            <p className="relative mx-auto mt-5 max-w-xl text-body-lg text-text-dim">{t('body')}</p>
                            <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
                                <PrimaryCta href="/register" analyticsId="cta-section-register">
                                    {t('ctaPrimary')}
                                </PrimaryCta>
                                <SecondaryCta href="#pricing" analyticsId="cta-section-pricing">
                                    {t('ctaSecondary')}
                                </SecondaryCta>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    )
}

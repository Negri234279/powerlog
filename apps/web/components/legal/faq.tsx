'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { ChevronDown } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { PolicyText } from './policy-text'

interface FaqGroup {
    title: string
    items: { q: string; a: string }[]
}

/** One collapsible question. Uses the shared `t-acc` accordion transition (height
 *  via grid-rows, chevron flip), each item independently open. */
function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="t-acc rounded-2xl bg-bg/40 ring-1 ring-hairline" data-open={open}>
            <TrackedButton
                analyticsId="faq-toggle"
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
                <span className="font-display text-base tracking-tight text-text">{q}</span>
                <span className="t-acc-chevron ml-auto shrink-0 text-text-faint">
                    <ChevronDown className="size-4" />
                </span>
            </TrackedButton>

            <div className="t-acc-panel">
                <div className="t-acc-panel-inner">
                    <p className="px-5 pb-5 text-body leading-relaxed text-text-dim">{a}</p>
                </div>
            </div>
        </div>
    )
}

/** Frequently asked questions, grouped. Content comes from the `legal.faq` message
 *  namespace, so questions are a pure content change in the message files. */
export function Faq() {
    const t = useTranslations('legal.faq')
    const groups = t.raw('groups') as FaqGroup[]

    return (
        <>
            <header>
                <h1 className="font-display text-h2">{t('title')}</h1>
                <p className="mt-5 text-body-lg text-text-dim">
                    <PolicyText text={t.raw('intro') as string} />
                </p>
            </header>

            <div className="mt-12 space-y-12">
                {groups.map((group) => (
                    <section key={group.title}>
                        <h2 className="font-mono text-eyebrow uppercase tracking-widest text-text-faint">
                            {group.title}
                        </h2>
                        <div className="mt-4 space-y-3">
                            {group.items.map((item) => (
                                <FaqItem key={item.q} q={item.q} a={item.a} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </>
    )
}

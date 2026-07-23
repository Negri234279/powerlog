import { getTranslations } from 'next-intl/server'

import { PolicyText } from './policy-text'

interface PolicySection {
    heading: string
    body?: string[]
    bullets?: string[]
    table?: { head: string[]; rows: string[][] }
    note?: string
}

/**
 * Renders a text-heavy policy (privacy / terms / cookies) from its `legal.<doc>`
 * message namespace. The whole document — intro plus an array of sections — is read
 * once via `t.raw`, so adding or reordering sections is a pure content change in the
 * message files; this component never needs to know how many there are.
 */
export async function PolicyDocument({ namespace }: { namespace: string }) {
    const t = await getTranslations(namespace)
    const tl = await getTranslations('legal')

    const sections = t.raw('sections') as PolicySection[]

    return (
        <>
            <header>
                <p className="font-mono text-eyebrow uppercase tracking-widest text-text-faint">
                    {tl('updatedLabel')} · {t('updated')}
                </p>
                <h1 className="mt-4 font-display text-h2">{t('title')}</h1>
                <p className="mt-5 text-body-lg text-text-dim">{t('intro')}</p>
            </header>

            <div className="mt-10 space-y-12">
                {sections.map((section) => (
                    <section key={section.heading}>
                        <h2 className="font-display text-h3">{section.heading}</h2>

                        {section.body?.map((paragraph) => (
                            <p key={paragraph} className="mt-4 text-body leading-relaxed text-text-dim">
                                <PolicyText text={paragraph} />
                            </p>
                        ))}

                        {section.table ? (
                            <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-hairline">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-white/[0.03]">
                                            {section.table.head.map((cell) => (
                                                <th
                                                    key={cell}
                                                    className="px-4 py-3 font-mono text-eyebrow uppercase tracking-widest text-text-faint"
                                                >
                                                    {cell}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.table.rows.map((row) => (
                                            <tr key={row.join('|')} className="border-t border-hairline">
                                                {row.map((cell) => (
                                                    <td key={cell} className="px-4 py-3 align-top text-text-dim">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        {section.bullets ? (
                            <ul className="mt-4 space-y-2.5">
                                {section.bullets.map((bullet) => (
                                    <li key={bullet} className="flex gap-3 text-body leading-relaxed text-text-dim">
                                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ember-gradient" />
                                        <span>{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : null}

                        {section.note ? (
                            <p className="mt-4 rounded-2xl bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-text-dim ring-1 ring-hairline">
                                <PolicyText text={section.note} />
                            </p>
                        ) : null}
                    </section>
                ))}
            </div>
        </>
    )
}

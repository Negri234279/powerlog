import { Mark } from '@/components/ui/icons'

const COLUMNS = [
    { title: 'Product', links: ['Features', 'Analytics', 'Coaching', 'Pricing'] },
    { title: 'Company', links: ['About', 'Changelog', 'Careers', 'Contact'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
]

export function SiteFooter() {
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
                    <p className="mt-4 max-w-xs text-body text-text-dim">
                        A precision instrument for serious lifters. Train like it&rsquo;s logged.
                    </p>
                </div>

                {COLUMNS.map((col) => (
                    <div key={col.title}>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{col.title}</p>
                        <ul className="mt-4 space-y-3">
                            {col.links.map((l) => (
                                <li key={l}>
                                    <a href="#" className="text-body text-text-dim transition-colors hover:text-text">
                                        {l}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mx-auto mt-14 flex max-w-[80rem] flex-col items-center justify-between gap-3 border-t border-hairline pt-8 font-mono text-eyebrow uppercase text-text-faint md:flex-row">
                <span>© {new Date().getFullYear()} powerlog</span>
                <span>Built for the bar</span>
            </div>
        </footer>
    )
}

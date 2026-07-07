import { LanguageSwitcher } from '@/components/app/language-switcher'
import { Mark } from '@/components/ui/icons'
import { TrackedLink } from '@/components/ui/tracked'

/** Centered, double-bezel card used by the login & register screens. */
export function AuthCard({
    title,
    subtitle,
    children,
    footer,
    languageSwitcher = true,
}: {
    title: string
    subtitle?: string
    children: React.ReactNode
    footer?: React.ReactNode
    /** Show the cookie-only EN|ES toggle under the card. Off where the screen has
     *  its own language control (e.g. register's in-form field). */
    languageSwitcher?: boolean
}) {
    return (
        <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 py-16">
            <div className="orb left-1/2 top-[-12%] size-[480px] -translate-x-1/2 bg-ember" />

            <div className="relative w-full max-w-md">
                <TrackedLink analyticsId="auth-logo" href="/" className="mb-8 flex items-center justify-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                        <Mark className="size-4.5" />
                    </span>
                    <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
                </TrackedLink>

                <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-7 md:p-8">
                        <h1 className="font-display text-h2">{title}</h1>
                        {subtitle ? <p className="mt-2 text-body text-text-dim">{subtitle}</p> : null}
                        <div className="mt-7">{children}</div>
                    </div>
                </div>

                {footer ? <p className="mt-6 text-center text-sm text-text-dim">{footer}</p> : null}

                {/* Guests have no profile yet: the switcher only sets the cookie here. */}
                {languageSwitcher ? (
                    <div className="mt-8 flex justify-center">
                        <LanguageSwitcher persist={false} />
                    </div>
                ) : null}
            </div>
        </main>
    )
}

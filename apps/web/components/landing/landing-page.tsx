import { Analytics } from '@/components/landing/analytics'
import { Coaching } from '@/components/landing/coaching'
import { CtaSection } from '@/components/landing/cta-section'
import { Features } from '@/components/landing/features'
import { Hero } from '@/components/landing/hero'
import { Pricing } from '@/components/landing/pricing'
import { Proof } from '@/components/landing/proof'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteNav } from '@/components/landing/site-nav'

/**
 * The marketing landing, shared by both locale routes (`/` → en, `/es` → es). The
 * active locale comes from the surrounding root layout, so this tree is
 * locale-agnostic: translations resolve through next-intl and the pricing currency
 * follows the locale.
 */
export function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <SiteNav />
            <main>
                <Hero />
                <Proof />
                <Features />
                <Analytics />
                <Coaching />
                <Pricing />
                <CtaSection />
            </main>
            <SiteFooter className="mt-auto" />
        </div>
    )
}

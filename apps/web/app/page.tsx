import { Analytics } from '@/components/landing/analytics'
import { Coaching } from '@/components/landing/coaching'
import { CtaSection } from '@/components/landing/cta-section'
import { Features } from '@/components/landing/features'
import { Hero } from '@/components/landing/hero'
import { Pricing } from '@/components/landing/pricing'
import { Proof } from '@/components/landing/proof'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteNav } from '@/components/landing/site-nav'

export default function LandingPage() {
    return (
        <>
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
            <SiteFooter />
        </>
    )
}

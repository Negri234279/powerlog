import { getTranslations } from 'next-intl/server'

import { AiDraftDetail } from '@/components/ai/ai-draft-detail'
import { TrackedLink } from '@/components/ui/tracked'

/**
 * One past AI conversation. A server shell around a single client component —
 * the detail is one query keyed on the id, and the id comes from the route.
 *
 * No `WorkoutsTabs` here: this is a place you went *into* from the history, so
 * it gets a breadcrumb, the same call the session and mesocycle detail pages make.
 */
export default async function AiDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
    const { draftId } = await params
    const t = await getTranslations('aiHistory.detail')

    return (
        <div className="max-w-5xl">
            <TrackedLink
                analyticsId="ai-draft-back"
                href="/workouts/ai"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {t('breadcrumb')}
            </TrackedLink>

            <div className="mt-3">
                <AiDraftDetail draftId={draftId} />
            </div>
        </div>
    )
}

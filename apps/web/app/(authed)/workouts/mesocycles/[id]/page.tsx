'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

import { MesocycleOverview } from '@/components/workouts/mesocycle-overview'

/** One of the user's own blocks: back goes to their block library. */
export default function MesocycleOverviewPage() {
    const t = useTranslations('mesocycles')
    const params = useParams<{ id: string }>()

    return (
        <MesocycleOverview
            mesocycleId={params.id}
            back={{
                href: '/workouts/mesocycles',
                label: t('breadcrumbMesocycles'),
                analyticsId: 'mesocycle-overview-breadcrumb',
            }}
            sessionsHref="/workouts"
        />
    )
}

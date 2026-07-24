'use client'

import { useTranslations } from 'next-intl'
import { useParams, useSearchParams } from 'next/navigation'

import { BACK_PARAM, backHref } from '@/lib/workouts/back-param'
import { SessionEditor } from '@/components/workouts/session-editor'

/** The athlete's own session: back goes to their training log, filters and all. */
export default function WorkoutSessionPage() {
    const t = useTranslations('workouts')
    const params = useParams<{ id: string }>()
    const searchParams = useSearchParams()

    return (
        <SessionEditor
            sessionId={params.id}
            back={{
                href: backHref('/workouts', searchParams.get(BACK_PARAM)),
                label: t('breadcrumbWorkouts'),
                analyticsId: 'session-breadcrumb-workouts',
            }}
        />
    )
}

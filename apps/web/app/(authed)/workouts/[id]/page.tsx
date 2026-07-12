'use client'

import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

import { SessionEditor } from '@/components/workouts/session-editor'

/** The athlete's own session: back goes to their training log. */
export default function WorkoutSessionPage() {
    const t = useTranslations('workouts')
    const params = useParams<{ id: string }>()

    return (
        <SessionEditor
            sessionId={params.id}
            back={{
                href: '/workouts',
                label: t('breadcrumbWorkouts'),
                analyticsId: 'session-breadcrumb-workouts',
            }}
        />
    )
}

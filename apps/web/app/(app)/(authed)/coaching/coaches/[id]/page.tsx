import { CoachDetailView } from '@/components/coaching/coach-detail-view'

/**
 * The athlete's view of one of their coaches — symmetric to the coach's
 * `/coaching/athletes/[id]`, but there are no coach-side sections to show (the
 * athlete's own training lives in /workouts), so the chat IS the page.
 */
export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return <CoachDetailView coachId={id} />
}

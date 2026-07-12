import type { AiMesocycleDraftAggregate } from '../../domain/entities/ai-mesocycle-draft.entity'

export interface AiMesocycleDraftSetView {
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}

export interface AiMesocycleDraftExerciseView {
    exerciseId: string
    slug: string
    name: string
    notes: string | null
    sets: AiMesocycleDraftSetView[]
}

export interface AiMesocycleDraftDayView {
    dayOffset: number
    label: string | null
    exercises: AiMesocycleDraftExerciseView[]
}

export interface AiMesocycleDraftMessageView {
    id: string
    role: string
    content: string
    createdAt: Date
}

/**
 * The proposal as the client receives it: one template week, plus how many weeks
 * to replicate it into. The builder does the replication — nothing about the
 * draft has been written to the workouts module.
 */
export interface AiMesocycleDraftView {
    id: string
    /** The athlete it was designed for, or null when it is the caller's own block. */
    athleteId: string | null
    provider: string
    model: string
    status: string
    weeks: number
    trainingDays: number[]
    goal: string | null
    /** The name the model proposed for the block. */
    name: string
    days: AiMesocycleDraftDayView[]
    messages: AiMesocycleDraftMessageView[]
    createdAt: Date
    updatedAt: Date
}

export function toAiMesocycleDraftView(draft: AiMesocycleDraftAggregate): AiMesocycleDraftView {
    return {
        id: draft.id,
        athleteId: draft.athleteId,
        provider: draft.provider.value,
        model: draft.model,
        status: draft.status.value,
        weeks: draft.weeks,
        trainingDays: [...draft.trainingDays],
        goal: draft.goal,
        name: draft.proposal.name,
        days: draft.proposal.days.map((day) => ({
            dayOffset: day.dayOffset,
            label: day.label,
            exercises: day.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) => ({ ...set })),
            })),
        })),
        messages: draft.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        })),
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
    }
}

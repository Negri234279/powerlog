import type { AiMesocycleDraftAggregate, DraftMesocycleDay } from '../../domain/entities/ai-mesocycle-draft.entity'

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

/** One expanded week of the block, as the client renders it (IA.7). */
export interface AiMesocycleDraftMicrocycleView {
    index: number
    isDeload: boolean
    days: AiMesocycleDraftDayView[]
}

/** How the block advances week to week; the backend already applied it. */
export interface AiMesocycleDraftProgressionView {
    model: string
    weeklyIntensityStepPct: number
    weeklySetIncrement: number
    deloadWeeks: number[]
    deloadFactor: number
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
    /** The template week (identical to `microcycles[0].days`). */
    days: AiMesocycleDraftDayView[]
    /** How the block progresses; already applied to `microcycles`. */
    progression: AiMesocycleDraftProgressionView
    /** The expanded block: one entry per week, ready to render. */
    microcycles: AiMesocycleDraftMicrocycleView[]
    messages: AiMesocycleDraftMessageView[]
    /** The resolved draft this one continues, if any. */
    parentDraftId: string | null
    /** The block this draft became, once it was created. */
    mesocycleId: string | null
    createdAt: Date
    updatedAt: Date
}

function toDayView(day: DraftMesocycleDay): AiMesocycleDraftDayView {
    return {
        dayOffset: day.dayOffset,
        label: day.label,
        exercises: day.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
        })),
    }
}

export function toAiMesocycleDraftView(draft: AiMesocycleDraftAggregate): AiMesocycleDraftView {
    const { proposal } = draft

    return {
        id: draft.id,
        athleteId: draft.athleteId,
        provider: draft.provider.value,
        model: draft.model,
        status: draft.status.value,
        weeks: draft.weeks,
        trainingDays: [...draft.trainingDays],
        goal: draft.goal,
        name: proposal.name,
        days: proposal.days.map(toDayView),
        progression: { ...proposal.progression, deloadWeeks: [...proposal.progression.deloadWeeks] },
        microcycles: proposal.microcycles.map((microcycle) => ({
            index: microcycle.index,
            isDeload: microcycle.isDeload,
            days: microcycle.days.map(toDayView),
        })),
        messages: draft.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        })),
        parentDraftId: draft.parentDraftId,
        mesocycleId: draft.mesocycleId,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
    }
}

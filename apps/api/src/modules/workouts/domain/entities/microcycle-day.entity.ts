import { MesocycleDayExerciseEntity } from './mesocycle-day-exercise.entity'

export interface MicrocycleDayProps {
    id: string
    order: number
    /** 0–6 offset from the microcycle's week start (0 = first training day of the week). */
    dayOffset: number
    label: string | null
    notes: string | null
    exercises: MesocycleDayExerciseEntity[]
}

/**
 * `MicrocycleDayEntity` — one training day within a microcycle (week). Owns its
 * ordered exercises; `dayOffset` places it inside the week when the microcycle is
 * generated into dated sessions. Part of the Mesocycle aggregate.
 */
export class MicrocycleDayEntity {
    private constructor(private readonly props: MicrocycleDayProps) {}

    static create(input: {
        id: string
        order: number
        dayOffset: number
        label?: string | null
        notes?: string | null
        exercises: MesocycleDayExerciseEntity[]
    }): MicrocycleDayEntity {
        return new MicrocycleDayEntity({
            id: input.id,
            order: input.order,
            dayOffset: input.dayOffset,
            label: input.label ?? null,
            notes: input.notes ?? null,
            exercises: input.exercises,
        })
    }

    static rehydrate(props: MicrocycleDayProps): MicrocycleDayEntity {
        return new MicrocycleDayEntity(props)
    }

    get id(): string {
        return this.props.id
    }

    get order(): number {
        return this.props.order
    }

    get dayOffset(): number {
        return this.props.dayOffset
    }

    get label(): string | null {
        return this.props.label
    }

    get notes(): string | null {
        return this.props.notes
    }

    get exercises(): readonly MesocycleDayExerciseEntity[] {
        return this.props.exercises
    }
}

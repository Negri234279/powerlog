import { MesocycleDaySetEntity } from './mesocycle-day-set.entity'

export interface MesocycleDayExerciseProps {
    id: string
    /** References a catalog `exercises` row (FK within the module). */
    exerciseId: string
    order: number
    notes: string | null
    sets: MesocycleDaySetEntity[]
}

/**
 * `MesocycleDayExerciseEntity` — one exercise within a microcycle day, owning an
 * ordered list of programmed sets. Part of the Mesocycle aggregate. Structurally
 * a "programmed exercise", so it satisfies the shape consumed by
 * `materializeProgrammedExercises` when generating sessions.
 */
export class MesocycleDayExerciseEntity {
    private constructor(private readonly props: MesocycleDayExerciseProps) {}

    static create(input: {
        id: string
        exerciseId: string
        order: number
        notes?: string | null
        sets: MesocycleDaySetEntity[]
    }): MesocycleDayExerciseEntity {
        return new MesocycleDayExerciseEntity({
            id: input.id,
            exerciseId: input.exerciseId,
            order: input.order,
            notes: input.notes ?? null,
            sets: input.sets,
        })
    }

    static rehydrate(props: MesocycleDayExerciseProps): MesocycleDayExerciseEntity {
        return new MesocycleDayExerciseEntity(props)
    }

    get id(): string {
        return this.props.id
    }

    get exerciseId(): string {
        return this.props.exerciseId
    }

    get order(): number {
        return this.props.order
    }

    get notes(): string | null {
        return this.props.notes
    }

    get sets(): readonly MesocycleDaySetEntity[] {
        return this.props.sets
    }
}

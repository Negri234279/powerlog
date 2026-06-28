import { TemplateSetEntity } from './template-set.entity'

export interface TemplateExerciseProps {
    id: string
    /** References a catalog `exercises` row (FK within the module). */
    exerciseId: string
    order: number
    notes: string | null
    sets: TemplateSetEntity[]
}

/**
 * `TemplateExerciseEntity` — one exercise within a template, owning an ordered
 * list of programmed sets. Part of the WorkoutTemplate aggregate.
 */
export class TemplateExerciseEntity {
    private constructor(private readonly props: TemplateExerciseProps) {}

    static create(input: {
        id: string
        exerciseId: string
        order: number
        notes?: string | null
        sets: TemplateSetEntity[]
    }): TemplateExerciseEntity {
        return new TemplateExerciseEntity({
            id: input.id,
            exerciseId: input.exerciseId,
            order: input.order,
            notes: input.notes ?? null,
            sets: input.sets,
        })
    }

    static rehydrate(props: TemplateExerciseProps): TemplateExerciseEntity {
        return new TemplateExerciseEntity(props)
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

    get sets(): readonly TemplateSetEntity[] {
        return this.props.sets
    }
}

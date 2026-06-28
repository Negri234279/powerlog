import { epleyOneRepMax } from '../e1rm'
import { ConflictingIntensityError } from '../errors/workouts.errors'
import type { RepsVO } from '../value-objects/reps.vo'
import type { RirVO } from '../value-objects/rir.vo'
import type { RpeVO } from '../value-objects/rpe.vo'
import type { WeightVO } from '../value-objects/weight.vo'

export interface WorkoutSetProps {
    id: string
    order: number
    /** Programmed targets (optional). */
    plannedWeight: WeightVO | null
    plannedReps: RepsVO | null
    /** Actually performed (optional until logged). */
    weight: WeightVO | null
    reps: RepsVO | null
    /** Intensity: at most one of RPE / RIR. */
    rpe: RpeVO | null
    rir: RirVO | null
    /** Denormalised estimated 1RM (kg), derived from actual weight × reps. */
    e1rmKg: number | null
    notes: string | null
}

/** Mutable fields when creating/editing a set (`order`, `id`, `e1rmKg` are managed). */
export interface WorkoutSetFields {
    plannedWeight?: WeightVO | null
    plannedReps?: RepsVO | null
    weight?: WeightVO | null
    reps?: RepsVO | null
    rpe?: RpeVO | null
    rir?: RirVO | null
    notes?: string | null
}

function deriveE1rm(weight: WeightVO | null, reps: RepsVO | null): number | null {
    return weight && reps ? epleyOneRepMax(weight.value, reps.value) : null
}

function assertSingleIntensity(rpe: RpeVO | null, rir: RirVO | null): void {
    if (rpe && rir) {
        throw new ConflictingIntensityError()
    }
}

/**
 * `WorkoutSetEntity` — one set within an exercise entry. Splits programmed
 * (`planned*`) from performed (`weight`/`reps`) values and keeps a denormalised
 * estimated 1RM in sync with the actual performance.
 */
export class WorkoutSetEntity {
    private constructor(private readonly props: WorkoutSetProps) {}

    static create(input: { id: string; order: number } & WorkoutSetFields): WorkoutSetEntity {
        assertSingleIntensity(input.rpe ?? null, input.rir ?? null)

        const weight = input.weight ?? null
        const reps = input.reps ?? null

        return new WorkoutSetEntity({
            id: input.id,
            order: input.order,
            plannedWeight: input.plannedWeight ?? null,
            plannedReps: input.plannedReps ?? null,
            weight,
            reps,
            rpe: input.rpe ?? null,
            rir: input.rir ?? null,
            e1rmKg: deriveE1rm(weight, reps),
            notes: input.notes ?? null,
        })
    }

    static rehydrate(props: WorkoutSetProps): WorkoutSetEntity {
        return new WorkoutSetEntity(props)
    }

    /** Apply a partial edit (`undefined` = leave, `null` = clear). Recomputes e1RM. */
    update(fields: WorkoutSetFields): void {
        if (fields.plannedWeight !== undefined) this.props.plannedWeight = fields.plannedWeight
        if (fields.plannedReps !== undefined) this.props.plannedReps = fields.plannedReps
        if (fields.weight !== undefined) this.props.weight = fields.weight
        if (fields.reps !== undefined) this.props.reps = fields.reps
        if (fields.rpe !== undefined) this.props.rpe = fields.rpe
        if (fields.rir !== undefined) this.props.rir = fields.rir
        if (fields.notes !== undefined) this.props.notes = fields.notes

        assertSingleIntensity(this.props.rpe, this.props.rir)

        this.props.e1rmKg = deriveE1rm(this.props.weight, this.props.reps)
    }

    setOrder(order: number): void {
        this.props.order = order
    }

    get id(): string {
        return this.props.id
    }

    get order(): number {
        return this.props.order
    }

    get plannedWeight(): WeightVO | null {
        return this.props.plannedWeight
    }

    get plannedReps(): RepsVO | null {
        return this.props.plannedReps
    }

    get weight(): WeightVO | null {
        return this.props.weight
    }

    get reps(): RepsVO | null {
        return this.props.reps
    }

    get rpe(): RpeVO | null {
        return this.props.rpe
    }

    get rir(): RirVO | null {
        return this.props.rir
    }

    get e1rmKg(): number | null {
        return this.props.e1rmKg
    }

    get notes(): string | null {
        return this.props.notes
    }
}

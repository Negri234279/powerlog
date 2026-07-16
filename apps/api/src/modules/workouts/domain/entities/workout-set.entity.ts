import { epleyOneRepMax } from '../e1rm'
import { ConflictingIntensityError } from '../errors/workouts.errors'
import type { SetOutcome } from '../set-outcome'
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
    /** Target intensity: at most one of RPE / RIR. */
    plannedRpe: RpeVO | null
    plannedRir: RirVO | null
    /** Actually performed (optional until logged). */
    weight: WeightVO | null
    reps: RepsVO | null
    /** Intensity actually felt: at most one of RPE / RIR. */
    rpe: RpeVO | null
    rir: RirVO | null
    /** Denormalised estimated 1RM (kg), derived from actual weight × reps. */
    e1rmKg: number | null
    /** How the set went; `null` until the athlete marks it done. */
    outcome: SetOutcome | null
    notes: string | null
}

/**
 * Mutable fields when creating/editing a set (`order`, `id`, `e1rmKg` are
 * managed). Every key is leave-or-set: absent leaves the value alone, so editing
 * a set's numbers can never silently mark it done — `outcome` has to be named to
 * move, and naming it `null` sends the set back to pending.
 */
export interface WorkoutSetFields {
    plannedWeight?: WeightVO | null
    plannedReps?: RepsVO | null
    plannedRpe?: RpeVO | null
    plannedRir?: RirVO | null
    weight?: WeightVO | null
    reps?: RepsVO | null
    rpe?: RpeVO | null
    rir?: RirVO | null
    outcome?: SetOutcome | null
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
 * (`planned*`) from performed (`weight`/`reps`) values — intensity included, so a
 * target RPE survives being marked done — and keeps a denormalised estimated 1RM
 * in sync with the actual performance.
 */
export class WorkoutSetEntity {
    private constructor(private readonly props: WorkoutSetProps) {}

    static create(input: { id: string; order: number } & WorkoutSetFields): WorkoutSetEntity {
        assertSingleIntensity(input.plannedRpe ?? null, input.plannedRir ?? null)
        assertSingleIntensity(input.rpe ?? null, input.rir ?? null)

        const weight = input.weight ?? null
        const reps = input.reps ?? null

        return new WorkoutSetEntity({
            id: input.id,
            order: input.order,
            plannedWeight: input.plannedWeight ?? null,
            plannedReps: input.plannedReps ?? null,
            plannedRpe: input.plannedRpe ?? null,
            plannedRir: input.plannedRir ?? null,
            weight,
            reps,
            rpe: input.rpe ?? null,
            rir: input.rir ?? null,
            e1rmKg: deriveE1rm(weight, reps),
            outcome: input.outcome ?? null,
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
        if (fields.plannedRpe !== undefined) this.props.plannedRpe = fields.plannedRpe
        if (fields.plannedRir !== undefined) this.props.plannedRir = fields.plannedRir
        if (fields.weight !== undefined) this.props.weight = fields.weight
        if (fields.reps !== undefined) this.props.reps = fields.reps
        if (fields.rpe !== undefined) this.props.rpe = fields.rpe
        if (fields.rir !== undefined) this.props.rir = fields.rir
        if (fields.outcome !== undefined) this.props.outcome = fields.outcome
        if (fields.notes !== undefined) this.props.notes = fields.notes

        assertSingleIntensity(this.props.plannedRpe, this.props.plannedRir)
        assertSingleIntensity(this.props.rpe, this.props.rir)

        this.props.e1rmKg = deriveE1rm(this.props.weight, this.props.reps)
    }

    /**
     * Record how the set went, together with what was actually performed. A
     * failed set needn't carry numbers: failing can mean the lift never went up.
     */
    markOutcome(outcome: SetOutcome, fields: WorkoutSetFields = {}): void {
        this.update({ ...fields, outcome })
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

    get plannedRpe(): RpeVO | null {
        return this.props.plannedRpe
    }

    get plannedRir(): RirVO | null {
        return this.props.plannedRir
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

    get outcome(): SetOutcome | null {
        return this.props.outcome
    }

    get notes(): string | null {
        return this.props.notes
    }
}

import { ConflictingIntensityError } from '../errors/workouts.errors'
import type { RepsVO } from '../value-objects/reps.vo'
import type { RirVO } from '../value-objects/rir.vo'
import type { RpeVO } from '../value-objects/rpe.vo'
import type { WeightVO } from '../value-objects/weight.vo'

export interface MesocycleDaySetProps {
    id: string
    order: number
    /** Programmed targets (all optional). */
    plannedWeight: WeightVO | null
    plannedReps: RepsVO | null
    /** Target intensity: at most one of RPE / RIR. */
    rpe: RpeVO | null
    rir: RirVO | null
    notes: string | null
}

/** Mutable fields when creating a programmed set (`order`, `id` are managed). */
export interface MesocycleDaySetFields {
    plannedWeight?: WeightVO | null
    plannedReps?: RepsVO | null
    rpe?: RpeVO | null
    rir?: RirVO | null
    notes?: string | null
}

function assertSingleIntensity(rpe: RpeVO | null, rir: RirVO | null): void {
    if (rpe && rir) {
        throw new ConflictingIntensityError()
    }
}

/**
 * `MesocycleDaySetEntity` — one programmed set within a microcycle day exercise.
 * Carries only planned targets (no performed values / e1RM); part of the
 * Mesocycle aggregate (built through its root). Structurally a "programmed set",
 * so it satisfies the shared shape consumed by `materializeProgrammedExercises`.
 */
export class MesocycleDaySetEntity {
    private constructor(private readonly props: MesocycleDaySetProps) {}

    static create(input: { id: string; order: number } & MesocycleDaySetFields): MesocycleDaySetEntity {
        assertSingleIntensity(input.rpe ?? null, input.rir ?? null)

        return new MesocycleDaySetEntity({
            id: input.id,
            order: input.order,
            plannedWeight: input.plannedWeight ?? null,
            plannedReps: input.plannedReps ?? null,
            rpe: input.rpe ?? null,
            rir: input.rir ?? null,
            notes: input.notes ?? null,
        })
    }

    static rehydrate(props: MesocycleDaySetProps): MesocycleDaySetEntity {
        return new MesocycleDaySetEntity(props)
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

    get rpe(): RpeVO | null {
        return this.props.rpe
    }

    get rir(): RirVO | null {
        return this.props.rir
    }

    get notes(): string | null {
        return this.props.notes
    }
}

import { ConflictingIntensityError } from '../errors/workouts.errors'
import type { RepsRangeVO } from '../value-objects/reps-range.vo'
import type { RirRangeVO } from '../value-objects/rir-range.vo'
import type { RpeRangeVO } from '../value-objects/rpe-range.vo'
import type { WeightRangeVO } from '../value-objects/weight-range.vo'

export interface TemplateSetProps {
    id: string
    order: number
    /** Programmed targets (all optional), each a range — `5` or `5-8`. */
    plannedWeight: WeightRangeVO | null
    plannedReps: RepsRangeVO | null
    /** Target intensity: at most one of RPE / RIR. */
    rpe: RpeRangeVO | null
    rir: RirRangeVO | null
    notes: string | null
}

/** Mutable fields when creating a programmed set (`order`, `id` are managed). */
export interface TemplateSetFields {
    plannedWeight?: WeightRangeVO | null
    plannedReps?: RepsRangeVO | null
    rpe?: RpeRangeVO | null
    rir?: RirRangeVO | null
    notes?: string | null
}

function assertSingleIntensity(rpe: RpeRangeVO | null, rir: RirRangeVO | null): void {
    if (rpe && rir) {
        throw new ConflictingIntensityError()
    }
}

/**
 * `TemplateSetEntity` — one programmed set within a template exercise. Carries
 * only planned targets (no performed values / e1RM); part of the
 * WorkoutTemplate aggregate (built through its root).
 */
export class TemplateSetEntity {
    private constructor(private readonly props: TemplateSetProps) {}

    static create(input: { id: string; order: number } & TemplateSetFields): TemplateSetEntity {
        assertSingleIntensity(input.rpe ?? null, input.rir ?? null)

        return new TemplateSetEntity({
            id: input.id,
            order: input.order,
            plannedWeight: input.plannedWeight ?? null,
            plannedReps: input.plannedReps ?? null,
            rpe: input.rpe ?? null,
            rir: input.rir ?? null,
            notes: input.notes ?? null,
        })
    }

    static rehydrate(props: TemplateSetProps): TemplateSetEntity {
        return new TemplateSetEntity(props)
    }

    get id(): string {
        return this.props.id
    }

    get order(): number {
        return this.props.order
    }

    get plannedWeight(): WeightRangeVO | null {
        return this.props.plannedWeight
    }

    get plannedReps(): RepsRangeVO | null {
        return this.props.plannedReps
    }

    get rpe(): RpeRangeVO | null {
        return this.props.rpe
    }

    get rir(): RirRangeVO | null {
        return this.props.rir
    }

    get notes(): string | null {
        return this.props.notes
    }
}

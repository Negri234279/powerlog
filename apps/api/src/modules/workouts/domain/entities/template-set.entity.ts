import { ConflictingIntensityError } from '../errors/workouts.errors'
import type { RepsVO } from '../value-objects/reps.vo'
import type { RirVO } from '../value-objects/rir.vo'
import type { RpeVO } from '../value-objects/rpe.vo'
import type { WeightVO } from '../value-objects/weight.vo'

export interface TemplateSetProps {
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
export interface TemplateSetFields {
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

import { MicrocycleDayEntity } from './microcycle-day.entity'

export interface MicrocycleProps {
    id: string
    /** 1-based position within the mesocycle (week 1, 2, …). */
    weekIndex: number
    label: string | null
    notes: string | null
    days: MicrocycleDayEntity[]
}

/**
 * `MicrocycleEntity` — one week of a mesocycle, owning its ordered training days.
 * Part of the Mesocycle aggregate.
 */
export class MicrocycleEntity {
    private constructor(private readonly props: MicrocycleProps) {}

    static create(input: {
        id: string
        weekIndex: number
        label?: string | null
        notes?: string | null
        days: MicrocycleDayEntity[]
    }): MicrocycleEntity {
        return new MicrocycleEntity({
            id: input.id,
            weekIndex: input.weekIndex,
            label: input.label ?? null,
            notes: input.notes ?? null,
            days: input.days,
        })
    }

    static rehydrate(props: MicrocycleProps): MicrocycleEntity {
        return new MicrocycleEntity(props)
    }

    get id(): string {
        return this.props.id
    }

    get weekIndex(): number {
        return this.props.weekIndex
    }

    get label(): string | null {
        return this.props.label
    }

    get notes(): string | null {
        return this.props.notes
    }

    get days(): readonly MicrocycleDayEntity[] {
        return this.props.days
    }
}

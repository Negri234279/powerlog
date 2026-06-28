import { WorkoutSetEntity, type WorkoutSetFields } from './workout-set.entity'

export interface ExerciseEntryProps {
    id: string
    /** References a catalog `exercises` row (FK within the module). */
    exerciseId: string
    order: number
    notes: string | null
    sets: WorkoutSetEntity[]
}

/**
 * `ExerciseEntryEntity` — one exercise within a session, owning an ordered list
 * of sets. Part of the WorkoutSession aggregate (mutated through its root).
 */
export class ExerciseEntryEntity {
    private constructor(private readonly props: ExerciseEntryProps) {}

    static create(input: {
        id: string
        exerciseId: string
        order: number
        notes?: string | null
    }): ExerciseEntryEntity {
        return new ExerciseEntryEntity({
            id: input.id,
            exerciseId: input.exerciseId,
            order: input.order,
            notes: input.notes ?? null,
            sets: [],
        })
    }

    static rehydrate(props: ExerciseEntryProps): ExerciseEntryEntity {
        return new ExerciseEntryEntity(props)
    }

    /** Append a set (its order is the next position). Returns the created set. */
    addSet(input: { id: string } & WorkoutSetFields): WorkoutSetEntity {
        const set = WorkoutSetEntity.create({ ...input, order: this.props.sets.length + 1 })
        this.props.sets.push(set)
        return set
    }

    removeSet(setId: string): boolean {
        const index = this.props.sets.findIndex((s) => s.id === setId)
        if (index === -1) return false
        this.props.sets.splice(index, 1)
        this.reindexSets()
        return true
    }

    getSet(setId: string): WorkoutSetEntity | undefined {
        return this.props.sets.find((s) => s.id === setId)
    }

    setOrder(order: number): void {
        this.props.order = order
    }

    private reindexSets(): void {
        this.props.sets.forEach((set, i) => set.setOrder(i + 1))
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

    get sets(): readonly WorkoutSetEntity[] {
        return this.props.sets
    }
}

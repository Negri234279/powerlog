import { ExerciseEntryNotFoundError, WorkoutSetNotFoundError } from '../errors/workouts.errors'
import type { WorkoutStatus } from '../workout-status'
import { ExerciseEntryEntity } from './exercise-entry.entity'
import type { WorkoutSetEntity, WorkoutSetFields } from './workout-set.entity'

export interface WorkoutSessionProps {
    id: string
    /** Owner; soft reference to the auth user (no DB FK across modules). */
    userId: string
    status: WorkoutStatus
    performedAt: Date
    notes: string | null
    /** Coach who planned this session, if any (soft ref). */
    plannedByUserId: string | null
    createdAt: Date
    updatedAt: Date
    entries: ExerciseEntryEntity[]
}

/**
 * `WorkoutSessionAggregate` — the root of the workouts context. Owns the
 * exercise entries and their sets; all mutations go through here so ordering and
 * `updatedAt` stay consistent. No domain events (analytics query the tables
 * directly), so it doesn't extend `AggregateRoot`.
 */
export class WorkoutSessionAggregate {
    private constructor(private readonly props: WorkoutSessionProps) {}

    static create(input: {
        id: string
        userId: string
        performedAt: Date
        status?: WorkoutStatus
        notes?: string | null
        plannedByUserId?: string | null
        now: Date
    }): WorkoutSessionAggregate {
        return new WorkoutSessionAggregate({
            id: input.id,
            userId: input.userId,
            status: input.status ?? 'planned',
            performedAt: input.performedAt,
            notes: input.notes ?? null,
            plannedByUserId: input.plannedByUserId ?? null,
            createdAt: input.now,
            updatedAt: input.now,
            entries: [],
        })
    }

    static rehydrate(props: WorkoutSessionProps): WorkoutSessionAggregate {
        return new WorkoutSessionAggregate(props)
    }

    /** Append an exercise (its order is the next position). Returns the entry. */
    addEntry(input: { id: string; exerciseId: string; notes?: string | null }, now: Date): ExerciseEntryEntity {
        const entry = ExerciseEntryEntity.create({ ...input, order: this.props.entries.length + 1 })
        this.props.entries.push(entry)
        this.touch(now)
        return entry
    }

    removeEntry(entryId: string, now: Date): void {
        const index = this.props.entries.findIndex((e) => e.id === entryId)
        if (index === -1) throw new ExerciseEntryNotFoundError()
        this.props.entries.splice(index, 1)
        this.props.entries.forEach((entry, i) => entry.setOrder(i + 1))
        this.touch(now)
    }

    addSet(entryId: string, input: { id: string } & WorkoutSetFields, now: Date): WorkoutSetEntity {
        const set = this.requireEntry(entryId).addSet(input)
        this.touch(now)
        return set
    }

    updateSet(entryId: string, setId: string, fields: WorkoutSetFields, now: Date): void {
        const set = this.requireEntry(entryId).getSet(setId)
        if (!set) throw new WorkoutSetNotFoundError()
        set.update(fields)
        this.touch(now)
    }

    removeSet(entryId: string, setId: string, now: Date): void {
        if (!this.requireEntry(entryId).removeSet(setId)) throw new WorkoutSetNotFoundError()
        this.touch(now)
    }

    /** Edit session-level details (`undefined` = leave unchanged). */
    editDetails(fields: { performedAt?: Date; notes?: string | null }, now: Date): void {
        if (fields.performedAt !== undefined) this.props.performedAt = fields.performedAt
        if (fields.notes !== undefined) this.props.notes = fields.notes
        this.touch(now)
    }

    /** Mark the session as performed. */
    complete(now: Date): void {
        this.props.status = 'completed'
        this.touch(now)
    }

    private requireEntry(entryId: string): ExerciseEntryEntity {
        const entry = this.props.entries.find((e) => e.id === entryId)
        if (!entry) throw new ExerciseEntryNotFoundError()
        return entry
    }

    private touch(now: Date): void {
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get status(): WorkoutStatus {
        return this.props.status
    }
    get performedAt(): Date {
        return this.props.performedAt
    }
    get notes(): string | null {
        return this.props.notes
    }
    get plannedByUserId(): string | null {
        return this.props.plannedByUserId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
    get entries(): readonly ExerciseEntryEntity[] {
        return this.props.entries
    }
}

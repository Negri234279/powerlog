import type { MesocycleStatus } from '../mesocycle-status'
import type { MesocycleNameVO } from '../value-objects/mesocycle-name.vo'
import { MesocycleDayExerciseEntity } from './mesocycle-day-exercise.entity'
import { type MesocycleDaySetFields, MesocycleDaySetEntity } from './mesocycle-day-set.entity'
import { MicrocycleDayEntity } from './microcycle-day.entity'
import { MicrocycleEntity } from './microcycle.entity'

/** A programmed exercise within a day the caller composed in the builder. */
export interface MesocycleDayExerciseInput {
    exerciseId: string
    notes?: string | null
    sets: MesocycleDaySetFields[]
}

/** A training day within a microcycle (its `dayOffset` places it in the week). */
export interface MicrocycleDayInput {
    dayOffset: number
    label?: string | null
    notes?: string | null
    exercises: MesocycleDayExerciseInput[]
}

/** A week within the mesocycle (weekIndex is assigned by position). */
export interface MicrocycleInput {
    label?: string | null
    notes?: string | null
    days: MicrocycleDayInput[]
}

/** The full editable content of a mesocycle (whole-tree upsert; `status` is
 *  managed separately so editing the plan never resets it). */
export interface MesocycleContentInput {
    name: MesocycleNameVO
    notes?: string | null
    goal?: string | null
    startDate?: Date | null
    microcycles: MicrocycleInput[]
}

export interface MesocycleProps {
    id: string
    /** Owner; soft reference to the auth user (no DB FK across modules). */
    ownerId: string
    /**
     * Coach who planned this block for the owner, if any (soft ref). When set,
     * the coach is the one who edits it and the owner just trains what it
     * generates — see `requireManageableMesocycle`.
     */
    plannedByUserId: string | null
    name: MesocycleNameVO
    notes: string | null
    goal: string | null
    /** Anchor date of week 1; needed to generate dated sessions. */
    startDate: Date | null
    status: MesocycleStatus
    createdAt: Date
    updatedAt: Date
    microcycles: MicrocycleEntity[]
}

/**
 * `MesocycleAggregate` — a multi-week training block owned by a user: microcycles
 * (weeks) → days → programmed exercises → sets. Edited as a whole tree (the
 * builder composes the full content and saves it), so there are no granular
 * mutators; `replaceContent` rebuilds the children while `status` is transitioned
 * on its own. No domain events (read via direct queries), so it doesn't extend
 * `AggregateRoot`. Sessions are produced later by materializing a microcycle.
 */
export class MesocycleAggregate {
    private constructor(private readonly props: MesocycleProps) {}

    static create(input: {
        id: string
        ownerId: string
        content: MesocycleContentInput
        plannedByUserId?: string | null
        idFactory: () => string
        now: Date
    }): MesocycleAggregate {
        return new MesocycleAggregate({
            id: input.id,
            ownerId: input.ownerId,
            plannedByUserId: input.plannedByUserId ?? null,
            name: input.content.name,
            notes: input.content.notes ?? null,
            goal: input.content.goal ?? null,
            startDate: input.content.startDate ?? null,
            status: 'draft',
            createdAt: input.now,
            updatedAt: input.now,
            microcycles: buildMicrocycles(input.content.microcycles, input.idFactory),
        })
    }

    static rehydrate(props: MesocycleProps): MesocycleAggregate {
        return new MesocycleAggregate(props)
    }

    /** Replace name, notes, goal, startDate and the whole microcycle tree. */
    replaceContent(content: MesocycleContentInput, idFactory: () => string, now: Date): void {
        this.props.name = content.name
        this.props.notes = content.notes ?? null
        this.props.goal = content.goal ?? null
        this.props.startDate = content.startDate ?? null
        this.props.microcycles = buildMicrocycles(content.microcycles, idFactory)
        this.props.updatedAt = now
    }

    setStatus(status: MesocycleStatus, now: Date): void {
        this.props.status = status
        this.props.updatedAt = now
    }

    /** The microcycle for a 1-based week, or null if the mesocycle has no such week. */
    microcycleForWeek(weekIndex: number): MicrocycleEntity | null {
        return this.props.microcycles.find((microcycle) => microcycle.weekIndex === weekIndex) ?? null
    }

    get id(): string {
        return this.props.id
    }
    get ownerId(): string {
        return this.props.ownerId
    }
    get plannedByUserId(): string | null {
        return this.props.plannedByUserId
    }
    get name(): MesocycleNameVO {
        return this.props.name
    }
    get notes(): string | null {
        return this.props.notes
    }
    get goal(): string | null {
        return this.props.goal
    }
    get startDate(): Date | null {
        return this.props.startDate
    }
    get status(): MesocycleStatus {
        return this.props.status
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
    get microcycles(): readonly MicrocycleEntity[] {
        return this.props.microcycles
    }
}

/** Build the week/day/exercise/set tree, assigning 1-based order by position. */
function buildMicrocycles(microcycles: MicrocycleInput[], idFactory: () => string): MicrocycleEntity[] {
    return microcycles.map((microcycle, weekIndex) =>
        MicrocycleEntity.create({
            id: idFactory(),
            weekIndex: weekIndex + 1,
            label: microcycle.label ?? null,
            notes: microcycle.notes ?? null,
            days: microcycle.days.map((day, dayIndex) =>
                MicrocycleDayEntity.create({
                    id: idFactory(),
                    order: dayIndex + 1,
                    dayOffset: day.dayOffset,
                    label: day.label ?? null,
                    notes: day.notes ?? null,
                    exercises: day.exercises.map((exercise, exerciseIndex) =>
                        MesocycleDayExerciseEntity.create({
                            id: idFactory(),
                            exerciseId: exercise.exerciseId,
                            order: exerciseIndex + 1,
                            notes: exercise.notes ?? null,
                            sets: exercise.sets.map((set, setIndex) =>
                                MesocycleDaySetEntity.create({ id: idFactory(), order: setIndex + 1, ...set }),
                            ),
                        }),
                    ),
                }),
            ),
        }),
    )
}

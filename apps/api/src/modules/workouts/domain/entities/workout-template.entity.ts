import { TemplateExerciseEntity } from './template-exercise.entity'
import { type TemplateSetFields, TemplateSetEntity } from './template-set.entity'
import type { TemplateNameVO } from '../value-objects/template-name.vo'

/**
 * Who a template is for, and therefore which plan pays for it: `personal` ones
 * are the owner's own training (athlete plan `maxTemplates`), `coaching` ones are
 * built to use with athletes (coach plan `maxTemplates`). Fixed at creation — a
 * template does not move between the two.
 */
export type TemplateScope = 'personal' | 'coaching'

/** A programmed exercise the caller composed in the builder (sets in display order). */
export interface TemplateExerciseInput {
    exerciseId: string
    notes?: string | null
    sets: TemplateSetFields[]
}

/** The full editable content of a template (whole-tree upsert). */
export interface TemplateContentInput {
    name: TemplateNameVO
    notes?: string | null
    exercises: TemplateExerciseInput[]
}

export interface WorkoutTemplateProps {
    id: string
    /** Owner; soft reference to the auth user (no DB FK across modules). */
    ownerId: string
    /** Personal (own training) or coaching (built for athletes). See {@link TemplateScope}. */
    scope: TemplateScope
    name: TemplateNameVO
    notes: string | null
    createdAt: Date
    updatedAt: Date
    exercises: TemplateExerciseEntity[]
}

/**
 * `WorkoutTemplateAggregate` — a reusable session blueprint owned by a user.
 * Owns its exercises and their programmed sets. Edited as a whole tree (the
 * builder composes the full content and saves it), so there are no granular
 * mutators; `replaceContent` rebuilds the children. No domain events (read via
 * direct queries), so it doesn't extend `AggregateRoot`.
 */
export class WorkoutTemplateAggregate {
    private constructor(private readonly props: WorkoutTemplateProps) {}

    static create(input: {
        id: string
        ownerId: string
        scope?: TemplateScope
        content: TemplateContentInput
        idFactory: () => string
        now: Date
    }): WorkoutTemplateAggregate {
        return new WorkoutTemplateAggregate({
            id: input.id,
            ownerId: input.ownerId,
            scope: input.scope ?? 'personal',
            name: input.content.name,
            notes: input.content.notes ?? null,
            createdAt: input.now,
            updatedAt: input.now,
            exercises: buildExercises(input.content.exercises, input.idFactory),
        })
    }

    static rehydrate(props: WorkoutTemplateProps): WorkoutTemplateAggregate {
        return new WorkoutTemplateAggregate(props)
    }

    /** Replace name, notes and the whole exercise/set tree. */
    replaceContent(content: TemplateContentInput, idFactory: () => string, now: Date): void {
        this.props.name = content.name
        this.props.notes = content.notes ?? null
        this.props.exercises = buildExercises(content.exercises, idFactory)
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get ownerId(): string {
        return this.props.ownerId
    }
    get scope(): TemplateScope {
        return this.props.scope
    }
    get name(): TemplateNameVO {
        return this.props.name
    }
    get notes(): string | null {
        return this.props.notes
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
    get exercises(): readonly TemplateExerciseEntity[] {
        return this.props.exercises
    }
}

/** Build the exercise/set entities, assigning 1-based display order by position. */
function buildExercises(exercises: TemplateExerciseInput[], idFactory: () => string): TemplateExerciseEntity[] {
    return exercises.map((exercise, exerciseIndex) =>
        TemplateExerciseEntity.create({
            id: idFactory(),
            exerciseId: exercise.exerciseId,
            order: exerciseIndex + 1,
            notes: exercise.notes ?? null,
            sets: exercise.sets.map((set, setIndex) =>
                TemplateSetEntity.create({ id: idFactory(), order: setIndex + 1, ...set }),
            ),
        }),
    )
}

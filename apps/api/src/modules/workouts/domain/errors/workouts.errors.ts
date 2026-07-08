import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the workouts context. Each carries a stable `code` the
 * global exception filter maps to GraphQL/HTTP + metrics.
 */
export abstract class WorkoutsError extends DomainError {}

export class InvalidWeightError extends WorkoutsError {
    readonly code = 'INVALID_WEIGHT'

    constructor() {
        super('Weight must be between 0 and 1000 kg.')
    }
}

export class InvalidRepsError extends WorkoutsError {
    readonly code = 'INVALID_REPS'

    constructor() {
        super('Reps must be a whole number between 1 and 1000.')
    }
}

export class InvalidRpeError extends WorkoutsError {
    readonly code = 'INVALID_RPE'

    constructor() {
        super('RPE must be between 0 and 10 in steps of 0.5.')
    }
}

export class InvalidRirError extends WorkoutsError {
    readonly code = 'INVALID_RIR'

    constructor() {
        super('RIR must be a whole number between 0 and 50.')
    }
}

export class ConflictingIntensityError extends WorkoutsError {
    readonly code = 'CONFLICTING_INTENSITY'

    constructor() {
        super('A set can record either RPE or RIR, not both.')
    }
}

export class ExerciseEntryNotFoundError extends WorkoutsError {
    readonly code = 'EXERCISE_ENTRY_NOT_FOUND'

    constructor() {
        super('Exercise entry not found in this session.')
    }
}

export class WorkoutSessionNotFoundError extends WorkoutsError {
    readonly code = 'WORKOUT_SESSION_NOT_FOUND'

    constructor() {
        super('Workout session not found.')
    }
}

export class ExerciseNotFoundError extends WorkoutsError {
    readonly code = 'EXERCISE_NOT_FOUND'

    constructor() {
        super('Exercise not found.')
    }
}

/** A catalog exercise failed validation (slug shape, empty name, …). */
export class InvalidExerciseError extends WorkoutsError {
    readonly code = 'INVALID_EXERCISE'

    constructor(message: string) {
        super(message)
    }
}

/** Tried to create/rename an exercise to a slug already in the catalog. */
export class ExerciseSlugTakenError extends WorkoutsError {
    readonly code = 'EXERCISE_SLUG_TAKEN'

    constructor() {
        super('An exercise with this slug already exists.')
    }
}

/** Tried to delete a catalog exercise that is still referenced by logged sets. */
export class ExerciseInUseError extends WorkoutsError {
    readonly code = 'EXERCISE_IN_USE'

    constructor() {
        super('This exercise is used in workouts and cannot be deleted.')
    }
}

export class WorkoutSetNotFoundError extends WorkoutsError {
    readonly code = 'WORKOUT_SET_NOT_FOUND'

    constructor() {
        super('Set not found in this exercise entry.')
    }
}

export class InvalidWorkoutCursorError extends WorkoutsError {
    readonly code = 'INVALID_WORKOUT_CURSOR'

    constructor() {
        super('The pagination cursor is malformed.')
    }
}

/** A coach tried to plan for an athlete they are not linked to. */
export class NotLinkedToAthleteError extends WorkoutsError {
    readonly code = 'NOT_LINKED_TO_ATHLETE'

    constructor() {
        super('You do not coach this athlete.')
    }
}

export class InvalidTemplateNameError extends WorkoutsError {
    readonly code = 'INVALID_TEMPLATE_NAME'

    constructor() {
        super('A template name must be between 1 and 100 characters.')
    }
}

export class WorkoutTemplateNotFoundError extends WorkoutsError {
    readonly code = 'WORKOUT_TEMPLATE_NOT_FOUND'

    constructor() {
        super('Workout template not found.')
    }
}

export class InvalidMesocycleNameError extends WorkoutsError {
    readonly code = 'INVALID_MESOCYCLE_NAME'

    constructor() {
        super('A mesocycle name must be between 1 and 100 characters.')
    }
}

export class MesocycleNotFoundError extends WorkoutsError {
    readonly code = 'MESOCYCLE_NOT_FOUND'

    constructor() {
        super('Mesocycle not found.')
    }
}

/** Tried to generate a week that has no matching microcycle in the mesocycle. */
export class MesocycleWeekNotFoundError extends WorkoutsError {
    readonly code = 'MESOCYCLE_WEEK_NOT_FOUND'

    constructor() {
        super('This mesocycle has no such week.')
    }
}

/** Tried to generate a week whose sessions already exist (without `replace`). */
export class MesocycleWeekAlreadyGeneratedError extends WorkoutsError {
    readonly code = 'MESOCYCLE_WEEK_ALREADY_GENERATED'

    constructor() {
        super('This week has already been generated. Enable replace to regenerate it.')
    }
}

/** Tried to generate a week with no start date to anchor it to. */
export class MesocycleStartDateRequiredError extends WorkoutsError {
    readonly code = 'MESOCYCLE_START_DATE_REQUIRED'

    constructor() {
        super('A start date is required to generate a week into dated sessions.')
    }
}

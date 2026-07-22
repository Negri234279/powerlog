import { AiSettingsError } from './ai-settings.errors'

export class AiGenerationNotFoundError extends AiSettingsError {
    readonly code = 'AI_GENERATION_NOT_FOUND'
    constructor() {
        super('That generation does not exist.')
    }
}

/**
 * The generation already finished, one way or the other. Raised when a worker
 * tries to settle it twice — a duplicated job, a retry after the result was
 * already written — which must never overwrite the first outcome.
 */
export class AiGenerationAlreadySettledError extends AiSettingsError {
    readonly code = 'AI_GENERATION_ALREADY_SETTLED'
    constructor() {
        super('That generation has already finished.')
    }
}

/**
 * The same thing is already being generated. Raised when two requests for one
 * scope race past the check and meet at the unique index — the athlete is told
 * to wait for the answer they are already paying for, not charged twice.
 */
export class AiGenerationAlreadyInFlightError extends AiSettingsError {
    readonly code = 'AI_GENERATION_ALREADY_IN_FLIGHT'
    constructor() {
        super('That is already being generated. Wait for it to finish.')
    }
}

/** A worker picked up a generation that was not waiting to be run. */
export class AiGenerationNotQueuedError extends AiSettingsError {
    readonly code = 'AI_GENERATION_NOT_QUEUED'
    constructor() {
        super('That generation is not waiting to be run.')
    }
}

export class InvalidAiGenerationStatusError extends AiSettingsError {
    readonly code = 'INVALID_AI_GENERATION_STATUS'
    constructor(value: string) {
        super(`"${value}" is not a generation status.`)
    }
}

export class InvalidAiGenerationKindError extends AiSettingsError {
    readonly code = 'INVALID_AI_GENERATION_KIND'
    constructor(value: string) {
        super(`"${value}" is not a kind of generation.`)
    }
}

/**
 * The persisted request does not match the kind that names it — a row edited by
 * hand, or a payload shape that changed under a job already queued. Re-asserted
 * on rehydrate because `request` is jsonb, which Postgres cannot shape-check.
 */
export class InvalidAiGenerationRequestError extends AiSettingsError {
    readonly code = 'INVALID_AI_GENERATION_REQUEST'
    constructor(reason: string) {
        super(`The generation request is not usable: ${reason}.`)
    }
}

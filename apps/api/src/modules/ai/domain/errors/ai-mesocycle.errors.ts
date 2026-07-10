import { AiSettingsError } from './ai-settings.errors'

export class AiMesocycleDraftNotFoundError extends AiSettingsError {
    readonly code = 'AI_MESOCYCLE_DRAFT_NOT_FOUND'
    constructor() {
        super('That mesocycle draft does not exist.')
    }
}

/** A draft already taken or discarded is frozen. */
export class AiMesocycleDraftNotOpenError extends AiSettingsError {
    readonly code = 'AI_MESOCYCLE_DRAFT_NOT_OPEN'
    constructor() {
        super('That mesocycle draft has already been resolved.')
    }
}

/**
 * The proposal is not a training week: no days, a day repeated, an exercise with
 * no sets. Raised when a model answer — or a row read back from `content` jsonb,
 * which Postgres cannot shape-check — fails the aggregate's invariants. The
 * reason names the structure, never the model's words.
 */
export class InvalidMesocycleDraftProposalError extends AiSettingsError {
    readonly code = 'INVALID_MESOCYCLE_DRAFT_PROPOSAL'
    constructor(reason: string) {
        super(`The proposed training week is not usable: ${reason}.`)
    }
}

/**
 * The model answered with something that is not the training week we asked for —
 * after a retry. Its own words are never echoed back to the client.
 */
export class InvalidAiMesocycleResponseError extends AiSettingsError {
    readonly code = 'INVALID_AI_MESOCYCLE_RESPONSE'
    constructor() {
        super('The model did not return a usable training week. Try again.')
    }
}

/**
 * The refinement thread hit its ceiling. A draft is a conversation about one
 * training week, not an open-ended chat — capping the turns is what stops the
 * feature from being used as a general-purpose model endpoint.
 */
export class AiDraftThreadExhaustedError extends AiSettingsError {
    readonly code = 'AI_DRAFT_THREAD_EXHAUSTED'
    constructor() {
        super('This draft has been refined as many times as it can be. Generate a new one.')
    }
}

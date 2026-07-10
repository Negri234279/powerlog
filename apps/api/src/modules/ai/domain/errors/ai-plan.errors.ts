import { AiSettingsError } from './ai-settings.errors'

/** The user has keys but none of them is both enabled and the default. */
export class NoDefaultAiProviderError extends AiSettingsError {
    readonly code = 'NO_DEFAULT_AI_PROVIDER'
    constructor() {
        super('Choose a default AI provider, and make sure it is not paused.')
    }
}

/** The default provider has no model selected, so there is nothing to call. */
export class AiModelNotSelectedError extends AiSettingsError {
    readonly code = 'AI_MODEL_NOT_SELECTED'
    constructor() {
        super('Pick a model for your default AI provider first.')
    }
}

/** The session is missing, someone else's, or already trained. */
export class SessionNotProgrammableError extends AiSettingsError {
    readonly code = 'SESSION_NOT_PROGRAMMABLE'
    constructor() {
        super('That session cannot be programmed.')
    }
}

export class AiPlanDraftNotFoundError extends AiSettingsError {
    readonly code = 'AI_PLAN_DRAFT_NOT_FOUND'
    constructor() {
        super('That plan draft does not exist.')
    }
}

/** A draft already accepted or discarded is frozen. */
export class AiPlanDraftNotOpenError extends AiSettingsError {
    readonly code = 'AI_PLAN_DRAFT_NOT_OPEN'
    constructor() {
        super('That plan draft has already been resolved.')
    }
}

/** A stored draft status is not one this code knows — corrupted at rest. */
export class InvalidPlanDraftStatusError extends AiSettingsError {
    readonly code = 'INVALID_PLAN_DRAFT_STATUS'
    constructor(value: string) {
        super(`Invalid plan draft status "${value}".`)
    }
}

/** A set cannot carry both an RPE and an RIR — they say the same thing twice. */
export class ConflictingPlanIntensityError extends AiSettingsError {
    readonly code = 'CONFLICTING_PLAN_INTENSITY'
    constructor() {
        super('A prescribed set cannot have both an RPE and an RIR.')
    }
}

/**
 * The model answered with something that is not the plan we asked for — after a
 * retry. Its own words are never echoed back to the client.
 */
export class InvalidAiPlanResponseError extends AiSettingsError {
    readonly code = 'INVALID_AI_PLAN_RESPONSE'
    constructor() {
        super('The model did not return a usable training plan. Try again.')
    }
}

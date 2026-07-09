import { AcceptPlanDraftHandler } from './commands/accept-plan-draft/accept-plan-draft.handler'
import { DeleteAiProviderKeyHandler } from './commands/delete-ai-provider-key/delete-ai-provider-key.handler'
import { DiscardPlanDraftHandler } from './commands/discard-plan-draft/discard-plan-draft.handler'
import { GenerateSessionPlanDraftHandler } from './commands/generate-session-plan-draft/generate-session-plan-draft.handler'
import { RefinePlanDraftHandler } from './commands/refine-plan-draft/refine-plan-draft.handler'
import { SetAiProviderDefaultHandler } from './commands/set-ai-provider-default/set-ai-provider-default.handler'
import { SetAiProviderEnabledHandler } from './commands/set-ai-provider-enabled/set-ai-provider-enabled.handler'
import { SetAiProviderKeyHandler } from './commands/set-ai-provider-key/set-ai-provider-key.handler'
import { UpdateAiProviderModelHandler } from './commands/update-ai-provider-model/update-ai-provider-model.handler'
import { RemoveAiConfigsOnUserDeleted } from './event-handlers/remove-ai-configs-on-user-deleted.handler'
import { GetMyAiSettingsHandler } from './queries/get-my-ai-settings/get-my-ai-settings.handler'
import { GetSessionPlanDraftHandler } from './queries/get-session-plan-draft/get-session-plan-draft.handler'
import { ListAiModelsHandler } from './queries/list-ai-models/list-ai-models.handler'
import { SetPrescriber } from './services/set-prescriber.service'

/** CQRS command handlers for the AI module. */
export const AI_COMMAND_HANDLERS = [
    SetAiProviderKeyHandler,
    UpdateAiProviderModelHandler,
    SetAiProviderEnabledHandler,
    SetAiProviderDefaultHandler,
    DeleteAiProviderKeyHandler,
    GenerateSessionPlanDraftHandler,
    RefinePlanDraftHandler,
    AcceptPlanDraftHandler,
    DiscardPlanDraftHandler,
]

/** CQRS query handlers for the AI module. */
export const AI_QUERY_HANDLERS = [GetMyAiSettingsHandler, ListAiModelsHandler, GetSessionPlanDraftHandler]

/** Integration-event handlers (react to events published by other modules). */
export const AI_EVENT_HANDLERS = [RemoveAiConfigsOnUserDeleted]

/** Application-layer services (not CQRS handlers). */
export const AI_APPLICATION_SERVICES = [SetPrescriber]

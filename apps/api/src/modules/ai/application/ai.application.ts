import { AcceptMesocycleDraftHandler } from './commands/accept-mesocycle-draft/accept-mesocycle-draft.handler'
import { AcceptPlanDraftHandler } from './commands/accept-plan-draft/accept-plan-draft.handler'
import { DeleteAiProviderKeyHandler } from './commands/delete-ai-provider-key/delete-ai-provider-key.handler'
import { DiscardMesocycleDraftHandler } from './commands/discard-mesocycle-draft/discard-mesocycle-draft.handler'
import { DiscardPlanDraftHandler } from './commands/discard-plan-draft/discard-plan-draft.handler'
import { ForkMesocycleDraftHandler } from './commands/fork-mesocycle-draft/fork-mesocycle-draft.handler'
import { ForkPlanDraftHandler } from './commands/fork-plan-draft/fork-plan-draft.handler'
import { GenerateMesocycleDraftHandler } from './commands/generate-mesocycle-draft/generate-mesocycle-draft.handler'
import { GenerateSessionPlanDraftHandler } from './commands/generate-session-plan-draft/generate-session-plan-draft.handler'
import { QueueMesocycleGenerationHandler } from './commands/queue-mesocycle-generation/queue-mesocycle-generation.handler'
import { QueueMesocycleRefinementHandler } from './commands/queue-mesocycle-refinement/queue-mesocycle-refinement.handler'
import { QueueSessionPlanGenerationHandler } from './commands/queue-session-plan-generation/queue-session-plan-generation.handler'
import { QueueSessionPlanRefinementHandler } from './commands/queue-session-plan-refinement/queue-session-plan-refinement.handler'
import { RunAiGenerationHandler } from './commands/run-ai-generation/run-ai-generation.handler'
import { RefineMesocycleDraftHandler } from './commands/refine-mesocycle-draft/refine-mesocycle-draft.handler'
import { RefinePlanDraftHandler } from './commands/refine-plan-draft/refine-plan-draft.handler'
import { SetAiProviderDefaultHandler } from './commands/set-ai-provider-default/set-ai-provider-default.handler'
import { SetAiProviderEnabledHandler } from './commands/set-ai-provider-enabled/set-ai-provider-enabled.handler'
import { SetAiProviderKeyHandler } from './commands/set-ai-provider-key/set-ai-provider-key.handler'
import { SetAiProviderTaskModelHandler } from './commands/set-ai-provider-task-model/set-ai-provider-task-model.handler'
import { UpdateAiProviderModelHandler } from './commands/update-ai-provider-model/update-ai-provider-model.handler'
import { LinkMesocycleOnCreatedFromDraft } from './event-handlers/link-mesocycle-on-created-from-draft.handler'
import { RecordAiUsageHandler } from './event-handlers/record-ai-usage.handler'
import { RemoveAiConfigsOnUserDeleted } from './event-handlers/remove-ai-configs-on-user-deleted.handler'
import { GetAiGenerationHandler } from './queries/get-ai-generation/get-ai-generation.handler'
import { GetMesocycleDraftByIdHandler } from './queries/get-mesocycle-draft-by-id/get-mesocycle-draft-by-id.handler'
import { GetMesocycleDraftHandler } from './queries/get-mesocycle-draft/get-mesocycle-draft.handler'
import { GetMyAiSettingsHandler } from './queries/get-my-ai-settings/get-my-ai-settings.handler'
import { GetMyAiUsageHandler } from './queries/get-my-ai-usage/get-my-ai-usage.handler'
import { GetPlanDraftHandler } from './queries/get-plan-draft/get-plan-draft.handler'
import { GetSessionPlanDraftHandler } from './queries/get-session-plan-draft/get-session-plan-draft.handler'
import { ListAiDraftsHandler } from './queries/list-ai-drafts/list-ai-drafts.handler'
import { ListAiModelsHandler } from './queries/list-ai-models/list-ai-models.handler'
import { AiConversation } from './services/ai-conversation.service'
import { AiGenerationQueueing } from './services/ai-generation-queueing.service'
import { AiProviderResolver } from './services/ai-provider-resolver.service'
import { MesocycleDesigner } from './services/mesocycle-designer.service'
import { SetPrescriber } from './services/set-prescriber.service'

/** CQRS command handlers for the AI module. */
export const AI_COMMAND_HANDLERS = [
    SetAiProviderKeyHandler,
    UpdateAiProviderModelHandler,
    SetAiProviderTaskModelHandler,
    SetAiProviderEnabledHandler,
    SetAiProviderDefaultHandler,
    DeleteAiProviderKeyHandler,
    GenerateSessionPlanDraftHandler,
    RefinePlanDraftHandler,
    AcceptPlanDraftHandler,
    DiscardPlanDraftHandler,
    GenerateMesocycleDraftHandler,
    RefineMesocycleDraftHandler,
    AcceptMesocycleDraftHandler,
    DiscardMesocycleDraftHandler,
    ForkPlanDraftHandler,
    ForkMesocycleDraftHandler,
    // The async half: four mutations that queue, and the one command that runs
    // whatever they queued.
    QueueSessionPlanGenerationHandler,
    QueueSessionPlanRefinementHandler,
    QueueMesocycleGenerationHandler,
    QueueMesocycleRefinementHandler,
    RunAiGenerationHandler,
]

/** CQRS query handlers for the AI module. */
export const AI_QUERY_HANDLERS = [
    GetMyAiSettingsHandler,
    GetMyAiUsageHandler,
    ListAiModelsHandler,
    GetSessionPlanDraftHandler,
    GetMesocycleDraftHandler,
    ListAiDraftsHandler,
    GetPlanDraftHandler,
    GetMesocycleDraftByIdHandler,
    GetAiGenerationHandler,
]

/**
 * Event handlers: user-deletion erasure, the async usage meter, and stamping a
 * draft with the block it became.
 */
export const AI_EVENT_HANDLERS = [RemoveAiConfigsOnUserDeleted, RecordAiUsageHandler, LinkMesocycleOnCreatedFromDraft]

/** Application-layer services (not CQRS handlers). */
export const AI_APPLICATION_SERVICES = [
    AiProviderResolver,
    AiConversation,
    SetPrescriber,
    MesocycleDesigner,
    AiGenerationQueueing,
]

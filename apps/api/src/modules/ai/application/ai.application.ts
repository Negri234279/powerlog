import { DeleteAiProviderKeyHandler } from './commands/delete-ai-provider-key/delete-ai-provider-key.handler'
import { SetAiProviderDefaultHandler } from './commands/set-ai-provider-default/set-ai-provider-default.handler'
import { SetAiProviderEnabledHandler } from './commands/set-ai-provider-enabled/set-ai-provider-enabled.handler'
import { SetAiProviderKeyHandler } from './commands/set-ai-provider-key/set-ai-provider-key.handler'
import { UpdateAiProviderModelHandler } from './commands/update-ai-provider-model/update-ai-provider-model.handler'
import { RemoveAiConfigsOnUserDeleted } from './event-handlers/remove-ai-configs-on-user-deleted.handler'
import { GetMyAiSettingsHandler } from './queries/get-my-ai-settings/get-my-ai-settings.handler'
import { ListAiModelsHandler } from './queries/list-ai-models/list-ai-models.handler'

/** CQRS command handlers for the AI settings module. */
export const AI_COMMAND_HANDLERS = [
    SetAiProviderKeyHandler,
    UpdateAiProviderModelHandler,
    SetAiProviderEnabledHandler,
    SetAiProviderDefaultHandler,
    DeleteAiProviderKeyHandler,
]

/** CQRS query handlers for the AI settings module. */
export const AI_QUERY_HANDLERS = [GetMyAiSettingsHandler, ListAiModelsHandler]

/** Integration-event handlers (react to events published by other modules). */
export const AI_EVENT_HANDLERS = [RemoveAiConfigsOnUserDeleted]

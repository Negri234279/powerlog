import { ProvisionProfileHandler } from './commands/provision-profile/provision-profile.handler'
import { RemoveAvatarHandler } from './commands/remove-avatar/remove-avatar.handler'
import { SetAvatarHandler } from './commands/set-avatar/set-avatar.handler'
import { UpdateProfileHandler } from './commands/update-profile/update-profile.handler'
import { CreateProfileOnUserRegistered } from './event-handlers/create-profile-on-user-registered.handler'
import { FillProfileOnGoogleLinked } from './event-handlers/fill-profile-on-google-linked.handler'
import { RemoveProfileOnUserDeleted } from './event-handlers/remove-profile-on-user-deleted.handler'
import { FindUserIdByHandleHandler } from './queries/find-user-id-by-handle/find-user-id-by-handle.handler'
import { GetMyProfileHandler } from './queries/get-my-profile/get-my-profile.handler'
import { GetProfileSnapshotHandler } from './queries/get-profile-snapshot/get-profile-snapshot.handler'
import { AvatarIngestor } from './services/avatar-ingestor.service'
import { AvatarUrls } from './services/avatar-urls.service'
import { HandleGenerator } from './services/handle-generator.service'

/** CQRS command handlers for the profile module. */
export const PROFILE_COMMAND_HANDLERS = [
    UpdateProfileHandler,
    SetAvatarHandler,
    RemoveAvatarHandler,
    ProvisionProfileHandler,
]

/** CQRS query handlers for the profile module. */
export const PROFILE_QUERY_HANDLERS = [GetMyProfileHandler, GetProfileSnapshotHandler, FindUserIdByHandleHandler]

/** Integration-event handlers (react to events published by other modules). */
export const PROFILE_EVENT_HANDLERS = [
    CreateProfileOnUserRegistered,
    FillProfileOnGoogleLinked,
    RemoveProfileOnUserDeleted,
]

/** Application-layer services (not CQRS handlers). */
export const PROFILE_APPLICATION_SERVICES = [AvatarIngestor, AvatarUrls, HandleGenerator]

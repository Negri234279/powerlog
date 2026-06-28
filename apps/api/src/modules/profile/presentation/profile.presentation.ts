import { AvatarFileController } from './controllers/avatar-file.controller'
import { ProfileAvatarController } from './controllers/profile-avatar.controller'
import { ProfileResolver } from './resolvers/profile.resolver'

/** GraphQL resolvers for the profile module. */
export const PROFILE_RESOLVERS = [ProfileResolver]

/** REST controllers (avatar upload/serve — file I/O doesn't fit GraphQL). */
export const PROFILE_CONTROLLERS = [ProfileAvatarController, AvatarFileController]

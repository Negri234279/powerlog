import { AuthCookies } from './cookies/auth-cookies'
import { AdminUserResolver } from './resolvers/admin-user.resolver'
import { AuthResolver } from './resolvers/auth.resolver'

/** GraphQL resolvers for the auth module. */
export const AUTH_RESOLVERS = [AuthResolver, AdminUserResolver]

/** Presentation-layer providers. */
export const AUTH_PRESENTATION_PROVIDERS = [AuthCookies]

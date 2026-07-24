import { AdminSupportResolver } from './resolvers/admin-support.resolver'
import { ContactResolver } from './resolvers/contact.resolver'

/** GraphQL resolvers for the support module. */
export const SUPPORT_RESOLVERS = [ContactResolver, AdminSupportResolver]

import { SetMetadata } from '@nestjs/common'

import type { UserRoleValue } from '../modules/auth/domain/value-objects/user-role.vo'

export const ROLES_KEY = 'roles'

/**
 * Restricts a resolver/handler to the given role(s). Enforced by `RolesGuard`,
 * which reads the role from the validated JWT (so the check is subject to the
 * ≤15m access-token staleness window). Use together with `JwtCookieGuard`.
 */
export const Roles = (...roles: UserRoleValue[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles)

import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import type { UnitsValue } from '../../../domain/value-objects/units.vo'
import type { UserRoleValue } from '../../../domain/value-objects/user-role.vo'
import { GetMeQuery } from './get-me.query'

/** Read model returned to the presentation layer (decoupled from the entity). */
export interface UserView {
    id: string
    email: string
    username: string
    units: UnitsValue
    role: UserRoleValue
    isAdmin: boolean
    emailVerified: boolean
    hasPassword: boolean
    createdAt: Date
}

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery, UserView> {
    constructor(
        private readonly users: UserRepository,
        private readonly profiles: ProfileSnapshotReader,
    ) {}

    async execute(query: GetMeQuery): Promise<UserView> {
        const user = await this.users.findById(query.userId)
        if (!user || !user.canAuthenticate()) {
            throw new UserNotFoundError()
        }

        // The handle lives in the profile module (single source of truth).
        const snapshot = await this.profiles.read(user.id)

        return {
            id: user.id,
            email: user.email.value,
            username: snapshot?.username ?? '',
            units: user.units.value,
            role: user.role.value,
            isAdmin: user.isAdmin,
            emailVerified: user.isEmailVerified(),
            hasPassword: user.hasPassword(),
            createdAt: user.createdAt,
        }
    }
}

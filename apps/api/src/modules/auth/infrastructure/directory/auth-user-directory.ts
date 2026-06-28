import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { FindUserIdByHandleQuery } from '../../../../shared/contracts/find-user-id-by-handle.query'
import { GetProfileSnapshotQuery } from '../../../../shared/contracts/get-profile-snapshot.query'
import type { ProfileSnapshot } from '../../../../shared/contracts/profile-snapshot-reader'
import { UserContact, UserDirectory } from '../../../../shared/contracts/user-directory'
import { UserRepository } from '../../domain/repositories/user.repository'

/**
 * Auth's implementation of the cross-module `UserDirectory`. The email lives in
 * auth (User aggregate); the public handle lives in the profile module, so
 * handle lookups and the handle field are resolved via the QueryBus (no
 * cross-module import).
 */
@Injectable()
export class AuthUserDirectory extends UserDirectory {
    constructor(
        private readonly users: UserRepository,
        private readonly queryBus: QueryBus,
    ) {
        super()
    }

    async findUserIdByUsername(username: string): Promise<string | null> {
        return this.queryBus.execute<FindUserIdByHandleQuery, string | null>(new FindUserIdByHandleQuery(username))
    }

    async getContact(userId: string): Promise<UserContact | null> {
        const user = await this.users.findById(userId)
        if (!user) return null

        const snapshot = await this.queryBus.execute<GetProfileSnapshotQuery, ProfileSnapshot | null>(
            new GetProfileSnapshotQuery(userId),
        )
        if (!snapshot) return null

        return { email: user.email.value, username: snapshot.username }
    }
}

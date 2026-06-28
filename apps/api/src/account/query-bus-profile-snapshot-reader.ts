import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetProfileSnapshotQuery } from '../shared/contracts/get-profile-snapshot.query'
import { type ProfileSnapshot, ProfileSnapshotReader } from '../shared/contracts/profile-snapshot-reader'

/**
 * Bridges the auth-side `ProfileSnapshotReader` port to the profile module via
 * the QueryBus. Kept outside `src/modules` so dispatching the shared query never
 * crosses a module boundary; the bus is global (`CqrsModule.forRoot`), so auth
 * and profile stay decoupled.
 */
@Injectable()
export class QueryBusProfileSnapshotReader extends ProfileSnapshotReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string): Promise<ProfileSnapshot | null> {
        return this.queryBus.execute<GetProfileSnapshotQuery, ProfileSnapshot | null>(
            new GetProfileSnapshotQuery(userId),
        )
    }
}

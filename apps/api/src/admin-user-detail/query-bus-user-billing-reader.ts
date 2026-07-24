import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetUserBillingQuery } from '../shared/contracts/get-user-billing.query'
import { type UserBillingSummary, UserBillingReader } from '../shared/contracts/user-billing'

/**
 * Bridges the auth-side {@link UserBillingReader} port to the billing module via
 * the QueryBus. Kept outside `src/modules` so dispatching the shared query never
 * crosses a module boundary; the bus is global (`CqrsModule.forRoot`), so auth
 * and billing stay decoupled — the same seam as `QueryBusProfileSnapshotReader`.
 */
@Injectable()
export class QueryBusUserBillingReader extends UserBillingReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string): Promise<UserBillingSummary> {
        return this.queryBus.execute<GetUserBillingQuery, UserBillingSummary>(new GetUserBillingQuery(userId))
    }
}

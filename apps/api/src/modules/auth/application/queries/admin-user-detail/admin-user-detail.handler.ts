import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { Entitlements, type EntitlementsSnapshot } from '../../../../../shared/contracts/entitlements'
import { type ProfileSnapshot, ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { type UserBillingSummary, UserBillingReader } from '../../../../../shared/contracts/user-billing'
import { type UserCoachingSummary, UserCoachingReader } from '../../../../../shared/contracts/user-coaching'
import { type UserTrainingSummary, UserTrainingReader } from '../../../../../shared/contracts/user-training'
import { type AdminUserAccount, AdminUserReadModel } from '../../ports/admin-user.read-model'
import { AdminUserDetailQuery } from './admin-user-detail.query'

/**
 * The full admin detail of one user: the auth-owned account plus everything the
 * other modules know about them, each read through its shared port. Every joined
 * section can be `null` on its own — a missing profile, a broken catalog, a
 * subsystem that throws — so a misconfiguration in one area still renders the
 * rest, the same principle as `AdminUsersHandler`. Only the account is required:
 * without it there is no user, and the query resolves to null.
 */
export interface AdminUserDetailView {
    account: AdminUserAccount
    profile: ProfileSnapshot | null
    entitlements: EntitlementsSnapshot | null
    billing: UserBillingSummary | null
    coaching: UserCoachingSummary | null
    training: UserTrainingSummary | null
}

@QueryHandler(AdminUserDetailQuery)
export class AdminUserDetailHandler implements IQueryHandler<AdminUserDetailQuery, AdminUserDetailView | null> {
    constructor(
        private readonly readModel: AdminUserReadModel,
        private readonly profiles: ProfileSnapshotReader,
        private readonly entitlements: Entitlements,
        private readonly billing: UserBillingReader,
        private readonly coaching: UserCoachingReader,
        private readonly training: UserTrainingReader,
    ) {}

    async execute(query: AdminUserDetailQuery): Promise<AdminUserDetailView | null> {
        const account = await this.readModel.byId(query.userId)
        if (!account) return null

        const [profile, entitlements, billing, coaching, training] = await Promise.all([
            this.profiles.read(query.userId).catch(() => null),
            this.entitlements.forUser(query.userId).catch(() => null),
            this.billing.read(query.userId).catch(() => null),
            this.coaching.read(query.userId).catch(() => null),
            this.training.read(query.userId).catch(() => null),
        ])

        return { account, profile, entitlements, billing, coaching, training }
    }
}

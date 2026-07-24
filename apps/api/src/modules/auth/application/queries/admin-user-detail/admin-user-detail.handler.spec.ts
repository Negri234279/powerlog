import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import type { UserBillingSummary } from '../../../../../shared/contracts/user-billing'
import { UserBillingReader } from '../../../../../shared/contracts/user-billing'
import type { UserCoachingSummary } from '../../../../../shared/contracts/user-coaching'
import { UserCoachingReader } from '../../../../../shared/contracts/user-coaching'
import type { UserTrainingSummary } from '../../../../../shared/contracts/user-training'
import { UserTrainingReader } from '../../../../../shared/contracts/user-training'
import { FakeEntitlements, FakeProfiles } from '../../../../../../tests/doubles/shared'
import {
    type AdminUserAccount,
    type AdminUserPage,
    AdminUserReadModel,
    type AdminUserStats,
} from '../../ports/admin-user.read-model'
import { AdminUserDetailHandler } from './admin-user-detail.handler'
import { AdminUserDetailQuery } from './admin-user-detail.query'

const userId = randomUUID()

function accountFor(id: string): AdminUserAccount {
    return {
        id,
        email: 'lifter@x.test',
        role: 'athlete',
        isAdmin: false,
        status: 'active',
        emailVerified: true,
        hasPassword: true,
        units: 'kg',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        lastSeenAt: new Date('2026-06-25T00:00:00.000Z'),
    }
}

const billing: UserBillingSummary = { subscriptions: [], mrrCents: 1200, currency: 'EUR' }
const coaching: UserCoachingSummary = { coaches: [], athleteCount: 0, athletes: [] }
const training: UserTrainingSummary = {
    sessions: 10,
    completedSessions: 8,
    sets: 120,
    distinctExercises: 15,
    lastSessionAt: new Date('2026-06-20T00:00:00.000Z'),
    sessionsLast30Days: 4,
}

/** Reads only `byId`; the listing methods are never exercised here. */
class StubAdminUserReadModel extends AdminUserReadModel {
    constructor(private readonly account: AdminUserAccount | null) {
        super()
    }
    list(): Promise<AdminUserPage> {
        return Promise.reject(new Error('unused'))
    }
    stats(): Promise<AdminUserStats> {
        return Promise.reject(new Error('unused'))
    }
    byId(): Promise<AdminUserAccount | null> {
        return Promise.resolve(this.account)
    }
}

/** A reader that returns a value, or throws to model a failing subsystem. */
class StubBilling extends UserBillingReader {
    constructor(private readonly value: UserBillingSummary | Error) {
        super()
    }
    read(): Promise<UserBillingSummary> {
        return this.value instanceof Error ? Promise.reject(this.value) : Promise.resolve(this.value)
    }
}
class StubCoaching extends UserCoachingReader {
    constructor(private readonly value: UserCoachingSummary | Error) {
        super()
    }
    read(): Promise<UserCoachingSummary> {
        return this.value instanceof Error ? Promise.reject(this.value) : Promise.resolve(this.value)
    }
}
class StubTraining extends UserTrainingReader {
    constructor(private readonly value: UserTrainingSummary | Error) {
        super()
    }
    read(): Promise<UserTrainingSummary> {
        return this.value instanceof Error ? Promise.reject(this.value) : Promise.resolve(this.value)
    }
}

function build(
    overrides: {
        account?: AdminUserAccount | null
        profile?: FakeProfiles
        billing?: UserBillingSummary | Error
        coaching?: UserCoachingSummary | Error
        training?: UserTrainingSummary | Error
    } = {},
): AdminUserDetailHandler {
    return new AdminUserDetailHandler(
        new StubAdminUserReadModel(overrides.account === undefined ? accountFor(userId) : overrides.account),
        overrides.profile ?? new FakeProfiles().set(userId, { username: 'lifter' }),
        new FakeEntitlements(),
        new StubBilling(overrides.billing ?? billing),
        new StubCoaching(overrides.coaching ?? coaching),
        new StubTraining(overrides.training ?? training),
    )
}

describe('AdminUserDetailHandler', () => {
    it('should_return_null_when_the_user_does_not_exist', async () => {
        const handler = build({ account: null })

        expect(await handler.execute(new AdminUserDetailQuery(userId))).toBeNull()
    })

    it('should_assemble_every_section_when_all_sources_resolve', async () => {
        const handler = build()

        const result = await handler.execute(new AdminUserDetailQuery(userId))

        expect(result?.account.id).toBe(userId)
        expect(result?.profile?.username).toBe('lifter')
        expect(result?.entitlements?.athlete.plan).toBe('test-athlete-unlimited')
        expect(result?.billing?.mrrCents).toBe(1200)
        expect(result?.coaching?.athleteCount).toBe(0)
        expect(result?.training?.sessions).toBe(10)
    })

    it('should_null_only_the_failing_section_and_keep_the_rest', async () => {
        const handler = build({ training: new Error('workouts down') })

        const result = await handler.execute(new AdminUserDetailQuery(userId))

        expect(result?.training).toBeNull()
        expect(result?.billing?.mrrCents).toBe(1200)
        expect(result?.account.id).toBe(userId)
    })

    it('should_leave_profile_null_when_the_user_has_no_profile_yet', async () => {
        const handler = build({ profile: new FakeProfiles() })

        const result = await handler.execute(new AdminUserDetailQuery(userId))

        expect(result?.profile).toBeNull()
        expect(result?.account.id).toBe(userId)
    })
})

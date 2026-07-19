import { describe, expect, it } from 'vitest'

import { FakeEntitlements, FakePlanDirectory, FakeProfiles } from '../../../../../../tests/doubles/shared'
import {
    type AdminUserFilter,
    type AdminUserPage,
    AdminUserReadModel,
    type AdminUserStats,
} from '../../ports/admin-user.read-model'
import { AdminUsersHandler } from './admin-users.handler'
import { AdminUsersQuery } from './admin-users.query'

class StubAdminUserReadModel extends AdminUserReadModel {
    lastCall?: { filter: AdminUserFilter; pagination: { limit: number; offset: number } }

    async list(filter: AdminUserFilter, pagination: { limit: number; offset: number }): Promise<AdminUserPage> {
        this.lastCall = { filter, pagination }
        return {
            rows: [
                {
                    id: 'u1',
                    email: 'a@b.c',
                    role: 'athlete',
                    isAdmin: false,
                    status: 'active',
                    emailVerified: true,
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 'u2',
                    email: 'c@d.e',
                    role: 'coach',
                    isAdmin: true,
                    status: 'active',
                    emailVerified: false,
                    createdAt: new Date('2026-01-02T00:00:00.000Z'),
                },
            ],
            total: 2,
        }
    }

    async stats(): Promise<AdminUserStats> {
        throw new Error('not used')
    }

    byId(): never {
        throw new Error('not used')
    }
}

describe('AdminUsersHandler', () => {
    it('passes the filter + pagination through and enriches rows with the handle and plan', async () => {
        const readModel = new StubAdminUserReadModel()
        const profiles = new FakeProfiles().set('u1', { username: 'alpha', avatarUrl: null, locale: null })
        // u2 has no profile snapshot → username falls back to null.
        const handler = new AdminUsersHandler(
            readModel,
            profiles,
            new FakeEntitlements().onAthlete({ plan: 'athlete-pro' }).withoutCoach(),
            new FakePlanDirectory(),
        )

        const page = await handler.execute(new AdminUsersQuery({ roles: ['coach'], search: 'a' }, 10, 20))

        expect(readModel.lastCall).toEqual({
            filter: { roles: ['coach'], search: 'a' },
            pagination: { limit: 10, offset: 20 },
        })
        expect(page).toMatchObject({ total: 2, limit: 10, offset: 20 })
        expect(page.rows[0]).toMatchObject({ id: 'u1', username: 'alpha', plan: 'athlete-pro' })
        expect(page.rows[1]).toMatchObject({ id: 'u2', username: null, isAdmin: true, plan: 'athlete-pro' })
    })

    it('still lists the users when the plan cannot be resolved', async () => {
        const broken = new FakeEntitlements()
        broken.forUser = () => Promise.reject(new Error('free plan missing for athlete'))
        const handler = new AdminUsersHandler(
            new StubAdminUserReadModel(),
            new FakeProfiles(),
            broken,
            new FakePlanDirectory(),
        )

        const page = await handler.execute(new AdminUsersQuery({}, 10, 0))

        // A broken catalog is exactly when an admin needs this page to open.
        expect(page.rows.map((row) => row.id)).toEqual(['u1', 'u2'])
        expect(page.rows[0]).toMatchObject({ plan: null })
    })

    it('resolves the picked plans into a membership the read model can match on', async () => {
        const readModel = new StubAdminUserReadModel()
        const directory = new FakePlanDirectory().subscribe('u2', 'coach-pro').withFreePlan('athlete-free', 'athlete')
        const handler = new AdminUsersHandler(readModel, new FakeProfiles(), new FakeEntitlements(), directory)

        const query = new AdminUsersQuery({ statuses: ['active'] }, 10, 0, ['coach-pro', 'athlete-free'])
        await handler.execute(query)

        // Both halves of the rule reach the read model: who subscribes to a picked
        // plan, and who falls back to a picked free one (everyone but the entitled).
        expect(readModel.lastCall?.filter.planMembership).toEqual({
            subscriberIds: ['u2'],
            freeAudiences: ['athlete'],
            entitledUserIds: ['u2'],
        })
    })

    it('does not filter by plan when none are picked', async () => {
        const readModel = new StubAdminUserReadModel()
        const directory = new FakePlanDirectory()
        const handler = new AdminUsersHandler(readModel, new FakeProfiles(), new FakeEntitlements(), directory)

        await handler.execute(new AdminUsersQuery({}, 10, 0, []))

        // An empty selection means "every plan", so billing is never asked — and
        // above all the read model must not get an empty membership, which means
        // the opposite: nobody.
        expect(readModel.lastCall?.filter.planMembership).toBeUndefined()
        expect(directory.lastAsked).toBeUndefined()
    })
})

import { describe, expect, it } from 'vitest'

import { FakeProfiles } from '../../../../../../tests/doubles/shared'
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
}

describe('AdminUsersHandler', () => {
    it('passes the filter + pagination through and enriches rows with the handle', async () => {
        const readModel = new StubAdminUserReadModel()
        const profiles = new FakeProfiles().set('u1', { username: 'alpha', avatarUrl: null, locale: null })
        // u2 has no profile snapshot → username falls back to null.
        const handler = new AdminUsersHandler(readModel, profiles)

        const page = await handler.execute(new AdminUsersQuery({ roles: ['coach'], search: 'a' }, 10, 20))

        expect(readModel.lastCall).toEqual({
            filter: { roles: ['coach'], search: 'a' },
            pagination: { limit: 10, offset: 20 },
        })
        expect(page).toMatchObject({ total: 2, limit: 10, offset: 20 })
        expect(page.rows[0]).toMatchObject({ id: 'u1', username: 'alpha' })
        expect(page.rows[1]).toMatchObject({ id: 'u2', username: null, isAdmin: true })
    })
})

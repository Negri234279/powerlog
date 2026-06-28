import { describe, expect, it } from 'vitest'

import { NotificationEntity } from './notification.entity'

const NOW = new Date('2026-03-01T10:00:00.000Z')

describe('NotificationEntity', () => {
    it('creates an unread notification carrying its payload', () => {
        const n = NotificationEntity.create({
            id: 'n-1',
            userId: 'u-1',
            type: 'coach_invitation',
            data: { invitationId: 'inv-1' },
            now: NOW,
        })

        expect(n.id).toBe('n-1')
        expect(n.userId).toBe('u-1')
        expect(n.type).toBe('coach_invitation')
        expect(n.data).toEqual({ invitationId: 'inv-1' })
        expect(n.readAt).toBeNull()
        expect(n.isRead()).toBe(false)
        expect(n.createdAt).toBe(NOW)
    })

    it('reports read state once rehydrated with a readAt', () => {
        const n = NotificationEntity.rehydrate({
            id: 'n-1',
            userId: 'u-1',
            type: 'coach_invitation',
            data: {},
            readAt: NOW,
            createdAt: NOW,
        })

        expect(n.isRead()).toBe(true)
        expect(n.readAt).toBe(NOW)
    })
})

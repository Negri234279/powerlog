import type { MessageEvent } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { testCounter, testGauge } from '../../../tests/doubles/shared'
import { InMemoryRealtimeBus } from '../bus/in-memory-realtime.bus'
import { CoachInvitationCreatedIntegrationEvent } from '../../shared/integration-events/coach-invitation-created.integration-event'
import { CoachLinkEstablishedIntegrationEvent } from '../../shared/integration-events/coach-link-established.integration-event'
import { CoachLinkRemovedIntegrationEvent } from '../../shared/integration-events/coach-link-removed.integration-event'
import { MesocycleAssignedIntegrationEvent } from '../../shared/integration-events/mesocycle-assigned.integration-event'
import { MesocycleWeekGeneratedIntegrationEvent } from '../../shared/integration-events/mesocycle-week-generated.integration-event'
import { WorkoutSessionPlannedIntegrationEvent } from '../../shared/integration-events/workout-session-planned.integration-event'
import { RealtimeHub } from '../realtime.hub'
import { PushOnCoachInvitationCreated } from './push-on-coach-invitation-created.handler'
import { PushOnCoachLinkEstablished } from './push-on-coach-link-established.handler'
import { PushOnCoachLinkRemoved } from './push-on-coach-link-removed.handler'
import { PushOnMesocycleAssigned } from './push-on-mesocycle-assigned.handler'
import { PushOnMesocycleWeekGenerated } from './push-on-mesocycle-week-generated.handler'
import { PushOnSessionPlanned } from './push-on-session-planned.handler'

/** A real hub with both parties connected, so each test asserts what actually
 *  reaches each stream rather than that `publish` was called. */
function setup() {
    const hub = new RealtimeHub(new InMemoryRealtimeBus(), testGauge(), testCounter(['type']))

    const connect = (userId: string): MessageEvent['data'][] => {
        const received: MessageEvent['data'][] = []
        hub.streamFor(userId).subscribe((message) => received.push(message.data))

        return received
    }

    return { hub, connect }
}

describe('realtime event handlers', () => {
    it('tells the coach an athlete joined, and the athlete who now coaches them', () => {
        const { hub, connect } = setup()
        const coach = connect('coach-1')
        const athlete = connect('athlete-1')

        new PushOnCoachLinkEstablished(hub).handle(
            new CoachLinkEstablishedIntegrationEvent('coach-1', 'athlete-1', 'coachy', 'athletey'),
        )

        expect(coach).toEqual([{ type: 'athlete_linked' }])
        expect(athlete).toEqual([{ type: 'coach_linked' }])
    })

    it('tells both parties when the relationship ends', () => {
        const { hub, connect } = setup()
        const coach = connect('coach-1')
        const athlete = connect('athlete-1')

        new PushOnCoachLinkRemoved(hub).handle(
            new CoachLinkRemovedIntegrationEvent('coach-1', 'athlete-1', 'coachy', 'athletey', 'athlete'),
        )

        expect(coach).toEqual([{ type: 'athlete_unlinked' }])
        expect(athlete).toEqual([{ type: 'coach_unlinked' }])
    })

    it('pushes an invitation to the invited athlete', () => {
        const { hub, connect } = setup()
        const athlete = connect('athlete-1')

        new PushOnCoachInvitationCreated(hub).handle(
            new CoachInvitationCreatedIntegrationEvent(
                'inv-1',
                'coach-1',
                'athlete-1',
                'athlete@example.com',
                'coachy',
                'tok',
            ),
        )

        expect(athlete).toEqual([{ type: 'coach_invitation' }])
    })

    it('pushes nothing when the invited email has no account yet', () => {
        const { hub, connect } = setup()
        const coach = connect('coach-1')

        new PushOnCoachInvitationCreated(hub).handle(
            new CoachInvitationCreatedIntegrationEvent(
                'inv-1',
                'coach-1',
                null,
                'stranger@example.com',
                'coachy',
                'tok',
            ),
        )

        expect(coach).toEqual([])
    })

    it('pushes a generated week to the athlete, once, as planned work', () => {
        const { hub, connect } = setup()
        const coach = connect('coach-1')
        const athlete = connect('athlete-1')

        new PushOnMesocycleWeekGenerated(hub).handle(
            new MesocycleWeekGeneratedIntegrationEvent('coach-1', 'athlete-1', 'meso-1', 2, 4),
        )

        // Four sessions landed, but the athlete's app only needs telling once — and
        // `session_planned` is already what it maps to a history refetch.
        expect(athlete).toEqual([{ type: 'session_planned' }])
        expect(coach).toEqual([])
    })

    it('pushes planned work to the athlete only', () => {
        const { hub, connect } = setup()
        const coach = connect('coach-1')
        const athlete = connect('athlete-1')

        new PushOnMesocycleAssigned(hub).handle(
            new MesocycleAssignedIntegrationEvent('coach-1', 'athlete-1', 'meso-1', 'Block 1'),
        )
        new PushOnSessionPlanned(hub).handle(
            new WorkoutSessionPlannedIntegrationEvent('coach-1', 'athlete-1', 'session-1', new Date()),
        )

        expect(athlete).toEqual([{ type: 'mesocycle_assigned' }, { type: 'session_planned' }])
        expect(coach).toEqual([])
    })
})

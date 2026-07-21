import {
    type CoachRosterFilter,
    CoachRosterReadModel,
    type CoachRosterRow,
} from '../../../src/modules/workouts/application/ports/coach-roster.read-model'

const EMPTY: Omit<CoachRosterRow, 'athleteId'> = {
    lastSessionAt: null,
    nextSessionAt: null,
    plannedCompleted: 0,
    plannedMissed: 0,
    completedSessions: 0,
    volumeKg: 0,
    previousVolumeKg: 0,
}

/** Canned roster rows keyed by athleteId; records the last filter it received. */
export class StubCoachRosterReadModel extends CoachRosterReadModel {
    lastFilter?: CoachRosterFilter

    constructor(private readonly seed: Record<string, Partial<CoachRosterRow>> = {}) {
        super()
    }

    async roster(filter: CoachRosterFilter): Promise<CoachRosterRow[]> {
        this.lastFilter = filter

        return filter.athleteIds.map((athleteId) => ({ athleteId, ...EMPTY, ...this.seed[athleteId] }))
    }
}

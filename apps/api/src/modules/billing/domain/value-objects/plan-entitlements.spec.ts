import { describe, expect, it } from 'vitest'

import { InvalidPlanEntitlementsError } from '../errors/billing.errors'
import { AthleteEntitlementsVO } from './athlete-entitlements.vo'
import { CoachEntitlementsVO } from './coach-entitlements.vo'
import { planEntitlementsFor } from './plan-entitlements'

const ATHLETE_FREE = { maxTemplates: 3, maxMesocycles: 1, maxWorkouts: null, ai: false }
const COACH_PRO = {
    maxAthletes: 20,
    planSessions: true,
    athlete: { maxTemplates: null, maxMesocycles: null, maxWorkouts: null, ai: true },
}

describe('plan entitlements', () => {
    it('collapses an athlete plan into a snapshot that grants no coaching', () => {
        const snapshot = AthleteEntitlementsVO.create(ATHLETE_FREE).toSnapshot('athlete-free')

        expect(snapshot).toEqual({
            plan: 'athlete-free',
            audience: 'athlete',
            maxTemplates: 3,
            maxMesocycles: 1,
            maxWorkouts: null,
            ai: false,
            planSessions: false,
            maxAthletes: 0,
        })
    })

    it("collapses a coach plan by merging in the coach's own athlete section", () => {
        const snapshot = CoachEntitlementsVO.create(COACH_PRO).toSnapshot('coach-pro')

        expect(snapshot).toEqual({
            plan: 'coach-pro',
            audience: 'coach',
            maxTemplates: null,
            maxMesocycles: null,
            maxWorkouts: null,
            ai: true,
            planSessions: true,
            maxAthletes: 20,
        })
    })

    it('keeps null maxAthletes as unlimited rather than turning it into a number', () => {
        const snapshot = CoachEntitlementsVO.create({ ...COACH_PRO, maxAthletes: null }).toSnapshot('coach-elite')

        expect(snapshot.maxAthletes).toBeNull()
    })

    it('rejects entitlements that are missing a feature', () => {
        expect(() => AthleteEntitlementsVO.create({ maxTemplates: 3, maxMesocycles: 1, maxWorkouts: null })).toThrow(
            InvalidPlanEntitlementsError,
        )
    })

    it('rejects a negative athlete cap', () => {
        expect(() => AthleteEntitlementsVO.create({ ...ATHLETE_FREE, maxTemplates: -1 })).toThrow(
            InvalidPlanEntitlementsError,
        )
    })

    it('rejects an unknown key instead of silently ignoring it', () => {
        // A renamed feature must fail loudly: left in the jsonb it would look present
        // in the DB while reading as "not granted" everywhere else.
        expect(() => AthleteEntitlementsVO.create({ ...ATHLETE_FREE, mesocyles: true })).toThrow(
            InvalidPlanEntitlementsError,
        )
    })

    it('rejects an athlete-shaped value for a coach plan', () => {
        expect(() => planEntitlementsFor('coach', ATHLETE_FREE)).toThrow(InvalidPlanEntitlementsError)
    })

    it('rejects a coach-shaped value for an athlete plan', () => {
        expect(() => planEntitlementsFor('athlete', COACH_PRO)).toThrow(InvalidPlanEntitlementsError)
    })

    it('rejects a negative athlete cap', () => {
        expect(() => CoachEntitlementsVO.create({ ...COACH_PRO, maxAthletes: -1 })).toThrow(
            InvalidPlanEntitlementsError,
        )
    })
})

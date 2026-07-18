import { describe, expect, it } from 'vitest'

import { InvalidPlanEntitlementsError } from '../errors/billing.errors'
import { AthleteEntitlementsVO } from './athlete-entitlements.vo'
import { CoachEntitlementsVO } from './coach-entitlements.vo'
import { planEntitlementsFor } from './plan-entitlements'

const ATHLETE_FREE = { maxTemplates: 3, maxMesocycles: 1, maxWorkouts: null, ai: false }
// Coaching only — no nested athlete section: the coach's own training is the
// (independent) athlete plan's business.
const COACH_PRO = { maxAthletes: 20, planSessions: true, maxTemplates: null, maxMesocycles: null, ai: true }

describe('plan entitlements', () => {
    it('sections an athlete plan: personal training only', () => {
        const section = AthleteEntitlementsVO.create(ATHLETE_FREE).toSection('athlete-free')

        expect(section).toEqual({
            plan: 'athlete-free',
            maxTemplates: 3,
            maxMesocycles: 1,
            maxWorkouts: null,
            ai: false,
        })
    })

    it('sections a coach plan: coaching only, no personal training riding along', () => {
        const section = CoachEntitlementsVO.create(COACH_PRO).toSection('coach-pro')

        expect(section).toEqual({
            plan: 'coach-pro',
            maxAthletes: 20,
            planSessions: true,
            maxTemplates: null,
            maxMesocycles: null,
            ai: true,
        })
    })

    it('renders an athlete plan for the pricing page with no coaching', () => {
        const view = AthleteEntitlementsVO.create(ATHLETE_FREE).publicView()

        expect(view.planSessions).toBe(false)
        // 0 = none — NOT null, which would read as unlimited.
        expect(view.maxAthletes).toBe(0)
    })

    it('renders a coach plan for the pricing page with no personal training', () => {
        const view = CoachEntitlementsVO.create(COACH_PRO).publicView()

        expect(view.maxWorkouts).toBe(0)
        expect(view.maxAthletes).toBe(20)
        expect(view.planSessions).toBe(true)
    })

    it('keeps null maxAthletes as unlimited rather than turning it into a number', () => {
        const section = CoachEntitlementsVO.create({ ...COACH_PRO, maxAthletes: null }).toSection('coach-elite')

        expect(section.maxAthletes).toBeNull()
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

    it('rejects the old nested coach shape — the athlete section moved to its own plan', () => {
        expect(() =>
            CoachEntitlementsVO.create({
                maxAthletes: 20,
                planSessions: true,
                athlete: ATHLETE_FREE,
            }),
        ).toThrow(InvalidPlanEntitlementsError)
    })

    it('rejects an athlete-shaped value for a coach plan', () => {
        expect(() => planEntitlementsFor('coach', ATHLETE_FREE)).toThrow(InvalidPlanEntitlementsError)
    })

    it('rejects a coach-shaped value for an athlete plan', () => {
        expect(() => planEntitlementsFor('athlete', COACH_PRO)).toThrow(InvalidPlanEntitlementsError)
    })

    it('rejects a negative coach cap', () => {
        expect(() => CoachEntitlementsVO.create({ ...COACH_PRO, maxAthletes: -1 })).toThrow(
            InvalidPlanEntitlementsError,
        )
    })
})

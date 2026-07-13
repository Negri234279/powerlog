import { z } from 'zod'

import type { EntitlementsSnapshot } from '../../../../shared/contracts/entitlements'
import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPlanEntitlementsError } from '../errors/billing.errors'

/**
 * What an athlete plan grants. Stored as jsonb and validated here with zod
 * rather than spread over columns: the catalog is edited from the admin panel,
 * so adding a check must be a line in this schema plus a field in the form —
 * not a migration. What Postgres cannot enforce, `assertIsValid` does, so every
 * entitlements value in the domain has been through it.
 *
 * `strictObject` rejects unknown keys on purpose: a renamed feature would
 * otherwise linger in the jsonb of old rows and read as "not granted" while
 * looking present in the DB.
 */
const schema = z.strictObject({
    /** Create workout templates and start sessions from them. */
    templates: z.boolean(),
    /** Design their own training blocks (mesocycles). */
    mesocycles: z.boolean(),
    /** Use the AI drafts. A boolean, not a quota: the key is the user's own
     *  (BYOK), so a generation costs the app nothing to serve. */
    ai: z.boolean(),
})

export type AthleteEntitlements = z.infer<typeof schema>

export class AthleteEntitlementsVO extends ValueObject<AthleteEntitlements> {
    /** Validate raw input (admin form, jsonb column) into a VO. */
    static create(raw: unknown): AthleteEntitlementsVO {
        return new AthleteEntitlementsVO(raw as AthleteEntitlements)
    }

    /** The flat view the rest of the app gates on. An athlete plan does no coaching. */
    toSnapshot(plan: string): EntitlementsSnapshot {
        return {
            plan,
            audience: 'athlete',
            templates: this.value.templates,
            mesocycles: this.value.mesocycles,
            ai: this.value.ai,
            planSessions: false,
            maxAthletes: 0,
        }
    }

    protected override assertIsValid(value: AthleteEntitlements): void {
        const parsed = schema.safeParse(value)
        if (!parsed.success) {
            throw new InvalidPlanEntitlementsError('athlete', z.prettifyError(parsed.error))
        }
    }

    override equals(other: AthleteEntitlementsVO): boolean {
        return JSON.stringify(this.value) === JSON.stringify(other.value)
    }
}

/** The athlete schema, reused by the coach plan's nested section. */
export const athleteEntitlementsSchema = schema

import type { PlanAudience } from './entitlements'

/**
 * Who is on which plan — the set-shaped counterpart of {@link Entitlements}.
 *
 * `Entitlements.forUser` answers "what plan is THIS user on", one user at a time.
 * That is the wrong shape for filtering a listing: resolving a plan per row can
 * only filter the rows already fetched, which would make the page's `total` and
 * its pagination lie. So this port answers the question the other way round —
 * given the plans an admin picked, who matches — and hands back something a
 * caller can turn into a single SQL predicate over its own table.
 *
 * The answer is a description, not a list of ids, because the free plan of an
 * audience has no subscription rows at all: everyone of that role who isn't
 * paying is on it. Enumerating them would mean enumerating most of the users.
 */

/**
 * A resolved plan selection, shaped so a caller with a users table can match it
 * without knowing the fallback rule:
 *
 * ```sql
 * id IN (subscriberIds) OR (role IN (freeAudiences) AND id NOT IN (entitledUserIds))
 * ```
 *
 * A selection that matches nobody yields all three empty — which the predicate
 * above must read as "no rows", not "no filter".
 */
export interface PlanMembership {
    /** Users whose entitling subscription points at one of the selected plans. */
    subscriberIds: string[]
    /**
     * Audiences whose active free plan was among the selection: a user of that
     * role with nothing entitling is on it.
     */
    freeAudiences: PlanAudience[]
    /**
     * Every user with an entitling subscription, to any plan. They are on that
     * plan and therefore NOT on the free one of their role — without this the
     * free-plan match would sweep up every subscriber too.
     */
    entitledUserIds: string[]
}

export abstract class PlanDirectory {
    /**
     * Resolve `planSlugs` (the slugs an admin picked) into the sets above. An
     * unknown or archived slug contributes nothing rather than failing: the
     * catalog can move under a bookmarked filter.
     */
    abstract membership(planSlugs: string[]): Promise<PlanMembership>
}

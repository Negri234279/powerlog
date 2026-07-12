/**
 * Where a workouts screen came from. The same session/block can be opened by the
 * athlete from their own log or by their coach from the athlete's page, and the
 * API authorizes both on the same queries — the only difference is where "back"
 * (and a delete) should land. Passing it in keeps a coach from being dumped into
 * their own training log on the way out.
 */
export interface BackLink {
    href: string
    label: string
    analyticsId: string
}

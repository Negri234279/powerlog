import type { MesocycleStatus } from '../../domain/mesocycle-status'

/** How a mesocycle week was generated into planned sessions. */
export type MesocycleGenerationMode = 'fresh' | 'replace'

/**
 * Abstracts the mesocycle observability counters so the application handlers stay
 * free of prom-client. Infrastructure binds it to a Prometheus-backed adapter;
 * tests use a recording fake. Only carries dimensions the CQRS command-duration
 * metric can't (the target status, the generation fan-out) — plain create/update/
 * delete counts are already the `_count` of `cqrs_command_duration_seconds`.
 */
export abstract class MesocycleMetrics {
    /** A mesocycle transitioned to `status`. */
    abstract recordStatusTransition(status: MesocycleStatus): void

    /** `sessions` planned sessions were materialized from a week, in `mode`. */
    abstract recordSessionsGenerated(mode: MesocycleGenerationMode, sessions: number): void
}

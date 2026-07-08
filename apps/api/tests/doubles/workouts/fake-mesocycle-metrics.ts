import { MesocycleMetrics } from '../../../src/modules/workouts/application/ports/mesocycle-metrics.port'
import type { MesocycleGenerationMode } from '../../../src/modules/workouts/application/ports/mesocycle-metrics.port'
import type { MesocycleStatus } from '../../../src/modules/workouts/domain/mesocycle-status'

/** Recording MesocycleMetrics double so tests can assert what was counted. */
export class FakeMesocycleMetrics extends MesocycleMetrics {
    readonly transitions: MesocycleStatus[] = []
    readonly generations: { mode: MesocycleGenerationMode; sessions: number }[] = []

    recordStatusTransition(status: MesocycleStatus): void {
        this.transitions.push(status)
    }

    recordSessionsGenerated(mode: MesocycleGenerationMode, sessions: number): void {
        this.generations.push({ mode, sessions })
    }
}

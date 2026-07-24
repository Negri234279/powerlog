import { SetMetrics } from '../../../src/modules/workouts/application/ports/set-metrics.port'
import type { SetOutcome } from '../../../src/modules/workouts/domain/set-outcome'

/** Recording SetMetrics double so tests can assert what was counted. */
export class FakeSetMetrics extends SetMetrics {
    readonly completed: SetOutcome[] = []

    recordCompleted(outcome: SetOutcome): void {
        this.completed.push(outcome)
    }
}

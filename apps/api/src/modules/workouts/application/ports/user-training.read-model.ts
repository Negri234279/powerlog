import type { UserTrainingSummary } from '../../../../shared/contracts/user-training'

/**
 * Per-user training figures for the admin detail. The result shape is the shared
 * contract's — this port is just the workouts-internal seam its Drizzle adapter
 * implements.
 */
export abstract class UserTrainingReadModel {
    abstract read(userId: string): Promise<UserTrainingSummary>
}

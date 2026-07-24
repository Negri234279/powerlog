import {
    type ExecutionBucketRow,
    type ExecutionFilter,
    type ExecutionRow,
    type StrengthPointRow,
    type StrengthProgressionFilter,
    type TrainingAnalyticsFilter,
    type TrainingDistribution,
    type TrainingSummaryRow,
    TrainingDashboardReadModel,
    type VolumeBucketRow,
} from '../../../src/modules/workouts/application/ports/training-dashboard.read-model'

const EMPTY_SUMMARY: TrainingSummaryRow = {
    sessions: 0,
    trainingDays: 0,
    totalSets: 0,
    totalReps: 0,
    totalVolumeKg: 0,
    avgRpe: null,
    distinctExercises: 0,
    bestSquatE1rmKg: null,
    bestBenchE1rmKg: null,
    bestDeadliftE1rmKg: null,
}

const EMPTY_EXECUTION: ExecutionRow = {
    plannedCompleted: 0,
    plannedMissed: 0,
    plannedUpcoming: 0,
    completedSessions: 0,
    previousCompletedSessions: 0,
    successSets: 0,
    failedSets: 0,
    pendingSets: 0,
    plannedLoadKg: 0,
    actualLoadKg: 0,
    plannedSets: 0,
    volumeKg: 0,
    previousVolumeKg: 0,
    firstSessionAt: null,
    lastSessionAt: null,
}

interface Seed {
    summary?: Partial<TrainingSummaryRow>
    volume?: VolumeBucketRow[]
    strength?: StrengthPointRow[]
    distribution?: TrainingDistribution
    execution?: Partial<ExecutionRow>
    executionSeries?: ExecutionBucketRow[]
}

/** Returns canned analytics and records the last filter each method received. */
export class StubTrainingDashboardReadModel extends TrainingDashboardReadModel {
    lastSummaryFilter?: TrainingAnalyticsFilter
    lastVolumeFilter?: TrainingAnalyticsFilter
    lastStrengthFilter?: StrengthProgressionFilter
    lastDistributionFilter?: TrainingAnalyticsFilter
    lastExecutionFilter?: ExecutionFilter
    lastExecutionSeriesFilter?: ExecutionFilter

    constructor(private readonly seed: Seed = {}) {
        super()
    }

    async summary(filter: TrainingAnalyticsFilter): Promise<TrainingSummaryRow> {
        this.lastSummaryFilter = filter
        return { ...EMPTY_SUMMARY, ...this.seed.summary }
    }

    async volumeSeries(filter: TrainingAnalyticsFilter): Promise<VolumeBucketRow[]> {
        this.lastVolumeFilter = filter
        return this.seed.volume ?? []
    }

    async strengthSeries(filter: StrengthProgressionFilter): Promise<StrengthPointRow[]> {
        this.lastStrengthFilter = filter
        return this.seed.strength ?? []
    }

    async distribution(filter: TrainingAnalyticsFilter): Promise<TrainingDistribution> {
        this.lastDistributionFilter = filter
        return this.seed.distribution ?? { byMuscle: [], byCategory: [], rpe: [], rir: [] }
    }

    async execution(filter: ExecutionFilter): Promise<ExecutionRow> {
        this.lastExecutionFilter = filter
        return { ...EMPTY_EXECUTION, ...this.seed.execution }
    }

    async executionSeries(filter: ExecutionFilter): Promise<ExecutionBucketRow[]> {
        this.lastExecutionSeriesFilter = filter
        return this.seed.executionSeries ?? []
    }
}

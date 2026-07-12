import { Module, type Provider } from '@nestjs/common'

import { AdminGuard } from '../../auth/admin.guard'
import { RolesGuard } from '../../auth/roles.guard'
import { AuthModule } from '../auth/auth.module'
import { CoachingModule } from '../coaching/coaching.module'
import {
    WORKOUTS_COMMAND_HANDLERS,
    WORKOUTS_EVENT_HANDLERS,
    WORKOUTS_QUERY_HANDLERS,
} from './application/workouts.application'
import { Clock } from './application/ports/clock.port'
import { AdminWorkoutStatsReadModel } from './application/ports/admin-workout-stats.read-model'
import { AthleteStrengthReadModel } from './application/ports/athlete-strength.read-model'
import { ExerciseSessionHistoryReadModel } from './application/ports/exercise-session-history.read-model'
import { ExerciseStatsReadModel } from './application/ports/exercise-stats.read-model'
import { IdGenerator } from './application/ports/id-generator.port'
import { MesocycleListReadModel } from './application/ports/mesocycle-list.read-model'
import { MesocycleMetrics } from './application/ports/mesocycle-metrics.port'
import { TrainingDashboardReadModel } from './application/ports/training-dashboard.read-model'
import { WorkoutHistoryReadModel } from './application/ports/workout-history.read-model'
import { WorkoutTemplateListReadModel } from './application/ports/workout-template-list.read-model'
import { ExerciseRepository } from './domain/repositories/exercise.repository'
import { MesocycleRepository } from './domain/repositories/mesocycle.repository'
import { WorkoutSessionRepository } from './domain/repositories/workout-session.repository'
import { WorkoutTemplateRepository } from './domain/repositories/workout-template.repository'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { DrizzleAdminWorkoutStatsReadModel } from './infrastructure/persistence/read-models/drizzle-admin-workout-stats.read-model'
import { DrizzleAthleteStrengthReadModel } from './infrastructure/persistence/read-models/drizzle-athlete-strength.read-model'
import { DrizzleExerciseSessionHistoryReadModel } from './infrastructure/persistence/read-models/drizzle-exercise-session-history.read-model'
import { DrizzleExerciseStatsReadModel } from './infrastructure/persistence/read-models/drizzle-exercise-stats.read-model'
import { DrizzleMesocycleListReadModel } from './infrastructure/persistence/read-models/drizzle-mesocycle-list.read-model'
import { DrizzleTrainingDashboardReadModel } from './infrastructure/persistence/read-models/drizzle-training-dashboard.read-model'
import { DrizzleWorkoutHistoryReadModel } from './infrastructure/persistence/read-models/drizzle-workout-history.read-model'
import { DrizzleWorkoutTemplateListReadModel } from './infrastructure/persistence/read-models/drizzle-workout-template-list.read-model'
import { DrizzleExerciseRepository } from './infrastructure/persistence/repositories/drizzle-exercise.repository'
import { DrizzleMesocycleRepository } from './infrastructure/persistence/repositories/drizzle-mesocycle.repository'
import { DrizzleWorkoutSessionRepository } from './infrastructure/persistence/repositories/drizzle-workout-session.repository'
import { DrizzleWorkoutTemplateRepository } from './infrastructure/persistence/repositories/drizzle-workout-template.repository'
import { PrometheusMesocycleMetrics } from './infrastructure/metrics/prometheus-mesocycle-metrics'
import { SystemClock } from './infrastructure/time/system-clock'
import { LinkedAthleteGuard } from './presentation/guards/linked-athlete.guard'
import { WORKOUTS_RESOLVERS } from './presentation/workouts.presentation'

/** Binds workouts ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: ExerciseRepository, useClass: DrizzleExerciseRepository },
    { provide: WorkoutSessionRepository, useClass: DrizzleWorkoutSessionRepository },
    { provide: WorkoutTemplateRepository, useClass: DrizzleWorkoutTemplateRepository },
    { provide: MesocycleRepository, useClass: DrizzleMesocycleRepository },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: ExerciseStatsReadModel, useClass: DrizzleExerciseStatsReadModel },
    { provide: ExerciseSessionHistoryReadModel, useClass: DrizzleExerciseSessionHistoryReadModel },
    { provide: AdminWorkoutStatsReadModel, useClass: DrizzleAdminWorkoutStatsReadModel },
    { provide: WorkoutHistoryReadModel, useClass: DrizzleWorkoutHistoryReadModel },
    { provide: TrainingDashboardReadModel, useClass: DrizzleTrainingDashboardReadModel },
    { provide: WorkoutTemplateListReadModel, useClass: DrizzleWorkoutTemplateListReadModel },
    { provide: MesocycleListReadModel, useClass: DrizzleMesocycleListReadModel },
    { provide: MesocycleMetrics, useClass: PrometheusMesocycleMetrics },
    { provide: AthleteStrengthReadModel, useClass: DrizzleAthleteStrengthReadModel },
]

@Module({
    // AuthModule for the shared JwtCookieGuard (it carries its own TokenSigner).
    // CoachingModule exports CoachLinks (authorizes coach-planned sessions).
    // DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule, CoachingModule],
    providers: [
        ...ADAPTERS,
        RolesGuard,
        AdminGuard,
        LinkedAthleteGuard,
        ...WORKOUTS_COMMAND_HANDLERS,
        ...WORKOUTS_QUERY_HANDLERS,
        ...WORKOUTS_EVENT_HANDLERS,
        ...WORKOUTS_RESOLVERS,
    ],
})
export class WorkoutsModule {}

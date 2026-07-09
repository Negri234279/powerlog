import { AddExerciseEntryHandler } from './commands/add-exercise-entry/add-exercise-entry.handler'
import { CompleteWorkoutSessionHandler } from './commands/complete-workout-session/complete-workout-session.handler'
import { CreateExerciseHandler } from './commands/create-exercise/create-exercise.handler'
import { CreateMesocycleHandler } from './commands/create-mesocycle/create-mesocycle.handler'
import { CreateSessionFromTemplateHandler } from './commands/create-session-from-template/create-session-from-template.handler'
import { CreateWorkoutSessionHandler } from './commands/create-workout-session/create-workout-session.handler'
import { CreateWorkoutTemplateHandler } from './commands/create-workout-template/create-workout-template.handler'
import { DeleteExerciseHandler } from './commands/delete-exercise/delete-exercise.handler'
import { DeleteMesocycleHandler } from './commands/delete-mesocycle/delete-mesocycle.handler'
import { DeleteWorkoutSessionHandler } from './commands/delete-workout-session/delete-workout-session.handler'
import { DeleteWorkoutTemplateHandler } from './commands/delete-workout-template/delete-workout-template.handler'
import { GenerateMesocycleWeekHandler } from './commands/generate-mesocycle-week/generate-mesocycle-week.handler'
import { LogSetHandler } from './commands/log-set/log-set.handler'
import { SetMesocycleStatusHandler } from './commands/set-mesocycle-status/set-mesocycle-status.handler'
import { UpdateMesocycleHandler } from './commands/update-mesocycle/update-mesocycle.handler'
import { PlanSessionFromTemplateHandler } from './commands/plan-session-from-template/plan-session-from-template.handler'
import { PlanWorkoutSessionHandler } from './commands/plan-workout-session/plan-workout-session.handler'
import { RemoveExerciseEntryHandler } from './commands/remove-exercise-entry/remove-exercise-entry.handler'
import { RemoveSetHandler } from './commands/remove-set/remove-set.handler'
import { UpdateExerciseHandler } from './commands/update-exercise/update-exercise.handler'
import { ApplySessionPlanHandler } from './commands/apply-session-plan/apply-session-plan.handler'
import { UpdateSetHandler } from './commands/update-set/update-set.handler'
import { UpdateWorkoutSessionHandler } from './commands/update-workout-session/update-workout-session.handler'
import { UpdateWorkoutTemplateHandler } from './commands/update-workout-template/update-workout-template.handler'
import { PurgeWorkoutsOnUserDeleted } from './event-handlers/purge-workouts-on-user-deleted.handler'
import { AdminWorkoutStatsHandler } from './queries/admin-workout-stats/admin-workout-stats.handler'
import { GetExerciseSessionHistoryHandler } from './queries/get-exercise-session-history/get-exercise-session-history.handler'
import { GetSessionPlanContextHandler } from './queries/get-session-plan-context/get-session-plan-context.handler'
import { GetExerciseStatsHandler } from './queries/get-exercise-stats/get-exercise-stats.handler'
import { GetMesocycleHandler } from './queries/get-mesocycle/get-mesocycle.handler'
import { GetStrengthProgressionHandler } from './queries/get-strength-progression/get-strength-progression.handler'
import { GetTrainingDistributionHandler } from './queries/get-training-distribution/get-training-distribution.handler'
import { GetTrainingSummaryHandler } from './queries/get-training-summary/get-training-summary.handler'
import { GetVolumeSeriesHandler } from './queries/get-volume-series/get-volume-series.handler'
import { GetWorkoutSessionHandler } from './queries/get-workout-session/get-workout-session.handler'
import { GetWorkoutTemplateHandler } from './queries/get-workout-template/get-workout-template.handler'
import { ListAdminExercisesHandler } from './queries/list-admin-exercises/list-admin-exercises.handler'
import { ListExercisesHandler } from './queries/list-exercises/list-exercises.handler'
import { ListMesocyclesHandler } from './queries/list-mesocycles/list-mesocycles.handler'
import { ListWorkoutSessionsHandler } from './queries/list-workout-sessions/list-workout-sessions.handler'
import { ListWorkoutTemplatesHandler } from './queries/list-workout-templates/list-workout-templates.handler'

/** CQRS command handlers for the workouts module. */
export const WORKOUTS_COMMAND_HANDLERS = [
    CreateWorkoutSessionHandler,
    AddExerciseEntryHandler,
    RemoveExerciseEntryHandler,
    LogSetHandler,
    UpdateSetHandler,
    ApplySessionPlanHandler,
    RemoveSetHandler,
    CompleteWorkoutSessionHandler,
    UpdateWorkoutSessionHandler,
    DeleteWorkoutSessionHandler,
    PlanWorkoutSessionHandler,
    CreateExerciseHandler,
    UpdateExerciseHandler,
    DeleteExerciseHandler,
    CreateWorkoutTemplateHandler,
    UpdateWorkoutTemplateHandler,
    DeleteWorkoutTemplateHandler,
    CreateSessionFromTemplateHandler,
    PlanSessionFromTemplateHandler,
    CreateMesocycleHandler,
    UpdateMesocycleHandler,
    DeleteMesocycleHandler,
    SetMesocycleStatusHandler,
    GenerateMesocycleWeekHandler,
]

/** CQRS query handlers for the workouts module. */
export const WORKOUTS_QUERY_HANDLERS = [
    ListExercisesHandler,
    ListAdminExercisesHandler,
    AdminWorkoutStatsHandler,
    GetWorkoutSessionHandler,
    GetWorkoutTemplateHandler,
    ListWorkoutTemplatesHandler,
    GetMesocycleHandler,
    ListMesocyclesHandler,
    GetExerciseStatsHandler,
    GetExerciseSessionHistoryHandler,
    GetSessionPlanContextHandler,
    ListWorkoutSessionsHandler,
    GetTrainingSummaryHandler,
    GetVolumeSeriesHandler,
    GetStrengthProgressionHandler,
    GetTrainingDistributionHandler,
]

/** CQRS event handlers for the workouts module (cross-module integration events). */
export const WORKOUTS_EVENT_HANDLERS = [PurgeWorkoutsOnUserDeleted]

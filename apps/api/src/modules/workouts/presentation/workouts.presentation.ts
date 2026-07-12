import { AdminExerciseResolver } from './resolvers/admin-exercise.resolver'
import { AdminWorkoutResolver } from './resolvers/admin-workout.resolver'
import { AnalyticsResolver } from './resolvers/analytics.resolver'
import { AthleteViewResolver } from './resolvers/athlete-view.resolver'
import { ExerciseResolver } from './resolvers/exercise.resolver'
import { MesocycleResolver } from './resolvers/mesocycle.resolver'
import { WorkoutSessionResolver } from './resolvers/workout-session.resolver'
import { WorkoutTemplateResolver } from './resolvers/workout-template.resolver'

/** GraphQL resolvers for the workouts module. */
export const WORKOUTS_RESOLVERS = [
    ExerciseResolver,
    AdminExerciseResolver,
    AdminWorkoutResolver,
    WorkoutSessionResolver,
    WorkoutTemplateResolver,
    MesocycleResolver,
    AnalyticsResolver,
    AthleteViewResolver,
]

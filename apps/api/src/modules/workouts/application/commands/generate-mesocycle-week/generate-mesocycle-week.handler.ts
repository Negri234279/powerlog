import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import {
    MesocycleStartDateRequiredError,
    MesocycleWeekAlreadyGeneratedError,
    MesocycleWeekNotFoundError,
} from '../../../domain/errors/workouts.errors'
import { MesocycleRepository } from '../../../domain/repositories/mesocycle.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { materializeProgrammedExercises } from '../../materialize-template'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { MesocycleMetrics } from '../../ports/mesocycle-metrics.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireOwnedMesocycle } from '../../require-owned-mesocycle'
import { GenerateMesocycleWeekCommand } from './generate-mesocycle-week.command'

const DAY_MS = 24 * 60 * 60 * 1000

@CommandHandler(GenerateMesocycleWeekCommand)
export class GenerateMesocycleWeekHandler implements ICommandHandler<
    GenerateMesocycleWeekCommand,
    WorkoutSessionView[]
> {
    constructor(
        private readonly mesocycles: MesocycleRepository,
        private readonly sessions: WorkoutSessionRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly metrics: MesocycleMetrics,
        private readonly logger?: PinoLogger,
    ) {
        this.logger?.setContext(GenerateMesocycleWeekHandler.name)
    }

    async execute(command: GenerateMesocycleWeekCommand): Promise<WorkoutSessionView[]> {
        const mesocycle = await requireOwnedMesocycle(this.mesocycles, command.mesocycleId, command.userId)

        const microcycle = mesocycle.microcycleForWeek(command.week)
        if (!microcycle) throw new MesocycleWeekNotFoundError()

        const anchor = command.weekStartDate ? new Date(command.weekStartDate) : mesocycle.startDate
        if (!anchor) throw new MesocycleStartDateRequiredError()

        const alreadyGenerated = (await this.sessions.generatedWeeks(mesocycle.id)).includes(command.week)
        if (alreadyGenerated) {
            if (!command.replace) throw new MesocycleWeekAlreadyGeneratedError()
            // Regenerate: drop the still-planned sessions (completed ones are kept).
            await this.sessions.deletePlannedByMesocycleWeek(mesocycle.id, command.week)
        }

        const now = this.clock.now()
        // Noon UTC on the anchor's calendar day, consistent with how dates are stored.
        const anchorNoonMs = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 12, 0, 0, 0)

        const views: WorkoutSessionView[] = []
        for (const day of microcycle.days) {
            const offsetDays = (command.week - 1) * 7 + day.dayOffset
            const performedAt = new Date(anchorNoonMs + offsetDays * DAY_MS)

            const session = WorkoutSessionAggregate.create({
                id: this.ids.uuid(),
                userId: command.userId,
                status: 'planned',
                performedAt,
                notes: day.notes ?? day.label ?? null,
                mesocycleId: mesocycle.id,
                mesocycleWeek: command.week,
                now,
            })

            materializeProgrammedExercises(session, day.exercises, this.ids, now)

            await this.sessions.save(session)
            views.push(toWorkoutSessionView(session))
        }

        const mode = alreadyGenerated ? 'replace' : 'fresh'
        this.metrics.recordSessionsGenerated(mode, views.length)
        this.logger?.info(
            { mesocycleId: mesocycle.id, week: command.week, sessions: views.length, mode },
            'mesocycle week generated',
        )

        return views
    }
}

import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { MesocycleDesignContextReader } from '../../../../../shared/contracts/mesocycle-design-context'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { AiGenerationQueueing } from '../../services/ai-generation-queueing.service'
import type { AiGenerationView } from '../../views/ai-generation.view'
import { QueueMesocycleGenerationCommand } from './queue-mesocycle-generation.command'

/**
 * Queues the work and returns. The block is the slowest of the four jobs — the
 * whole exercise catalog goes into the prompt and a full training week comes
 * back — so it is the one that least belongs inside a request.
 *
 * The plan gate, the coach↔athlete link and the provider key are checked here so
 * none of them is discovered half a minute later through a failed job. The worker
 * re-checks all of it ({@link GenerateMesocycleDraftHandler} is the authority).
 */
@CommandHandler(QueueMesocycleGenerationCommand)
export class QueueMesocycleGenerationHandler implements ICommandHandler<
    QueueMesocycleGenerationCommand,
    AiGenerationView
> {
    constructor(
        private readonly context: MesocycleDesignContextReader,
        private readonly designer: MesocycleDesigner,
        private readonly entitlements: Entitlements,
        private readonly queueing: AiGenerationQueueing,
    ) {}

    async execute(command: QueueMesocycleGenerationCommand): Promise<AiGenerationView> {
        // Designing for an athlete draws on the coach plan; designing for yourself
        // draws on your athlete plan.
        const audience = command.athleteId ? 'coach' : 'athlete'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

        // Deliberately read twice — here and in the job. It is the read that says
        // whether the coach may design for this athlete at all, and being told
        // "you do not coach them" belongs in the mutation, not in a failure the
        // athlete waits half a minute for.
        await this.context.read(command.userId, command.athleteId)

        await this.designer.resolveConfig(command.userId)

        return this.queueing.enqueue(command.userId, 'mesocycle', {
            athleteId: command.athleteId,
            weeks: command.weeks,
            trainingDays: command.trainingDays,
            goal: command.goal,
            prompt: command.prompt,
        })
    }
}

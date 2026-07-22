import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { AiGenerationQueueing } from '../../services/ai-generation-queueing.service'
import type { AiGenerationView } from '../../views/ai-generation.view'
import { QueueMesocycleGenerationCommand } from './queue-mesocycle-generation.command'

/**
 * Queues the work and returns. The block is the slowest of the four jobs — the
 * whole exercise catalog goes into the prompt and a full training week comes
 * back — so it is the one that least belongs inside a request.
 *
 * The plan gate and the provider key are checked here so a plan without AI, or a
 * missing key, is refused in the mutation. The worker re-checks both
 * ({@link GenerateMesocycleDraftHandler} is the authority).
 */
@CommandHandler(QueueMesocycleGenerationCommand)
export class QueueMesocycleGenerationHandler implements ICommandHandler<
    QueueMesocycleGenerationCommand,
    AiGenerationView
> {
    constructor(
        private readonly designer: MesocycleDesigner,
        private readonly entitlements: Entitlements,
        private readonly queueing: AiGenerationQueueing,
    ) {}

    async execute(command: QueueMesocycleGenerationCommand): Promise<AiGenerationView> {
        // Designing for an athlete draws on the coach plan; designing for yourself
        // draws on your athlete plan.
        const audience = command.athleteId ? 'coach' : 'athlete'
        await this.entitlements.assertFeature(command.userId, audience, 'ai')

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

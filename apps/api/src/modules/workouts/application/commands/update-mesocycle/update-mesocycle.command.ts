import type { MesocycleContentRaw } from '../../mesocycle-content'

export class UpdateMesocycleCommand {
    constructor(
        public readonly ownerId: string,
        public readonly mesocycleId: string,
        public readonly content: MesocycleContentRaw,
    ) {}
}

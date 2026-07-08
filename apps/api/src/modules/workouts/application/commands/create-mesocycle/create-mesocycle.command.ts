import type { MesocycleContentRaw } from '../../mesocycle-content'

export class CreateMesocycleCommand {
    constructor(
        public readonly ownerId: string,
        public readonly content: MesocycleContentRaw,
    ) {}
}

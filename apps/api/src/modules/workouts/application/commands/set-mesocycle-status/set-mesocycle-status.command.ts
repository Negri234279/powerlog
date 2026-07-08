import type { MesocycleStatus } from '../../../domain/mesocycle-status'

export class SetMesocycleStatusCommand {
    constructor(
        public readonly ownerId: string,
        public readonly mesocycleId: string,
        public readonly status: MesocycleStatus,
    ) {}
}

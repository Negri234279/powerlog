export class DeleteMesocycleCommand {
    constructor(
        public readonly ownerId: string,
        public readonly mesocycleId: string,
    ) {}
}

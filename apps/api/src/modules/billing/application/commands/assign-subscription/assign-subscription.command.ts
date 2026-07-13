/** Admin grant: put a user on a plan with no gateway and no charge. */
export class AssignSubscriptionCommand {
    constructor(
        readonly userId: string,
        readonly planId: string,
        /** When the grant runs out. Null → a year, which is as good as "for now". */
        readonly until: Date | null,
    ) {}
}

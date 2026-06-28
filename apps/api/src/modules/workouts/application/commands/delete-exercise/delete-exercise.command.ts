/** Delete a catalog exercise (admin-only; blocked if referenced by any workout). */
export class DeleteExerciseCommand {
    constructor(public readonly exerciseId: string) {}
}

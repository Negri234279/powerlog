/** Whether an email address is free to register (no existing user owns it). */
export class EmailAvailableQuery {
    constructor(public readonly email: string) {}
}

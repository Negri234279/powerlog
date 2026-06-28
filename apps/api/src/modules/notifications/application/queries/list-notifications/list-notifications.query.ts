/** Paginated notification inbox for the caller (keyset cursor, newest first). */
export class ListNotificationsQuery {
    constructor(
        public readonly userId: string,
        public readonly limit: number,
        public readonly cursor?: string | null,
    ) {}
}

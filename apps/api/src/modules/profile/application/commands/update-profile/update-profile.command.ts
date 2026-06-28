/**
 * Raw profile fields from presentation. Per field: `undefined`/absent = leave
 * unchanged, `null` = clear, a value = set. Validated into VOs by the handler.
 */
export interface UpdateProfileFieldsRaw {
    displayName?: string
    firstName?: string | null
    lastName?: string | null
    birthDate?: string | null
    sex?: string | null
    heightCm?: number | null
    bio?: string | null
    country?: string | null
    timezone?: string | null
    locale?: string | null
}

export class UpdateProfileCommand {
    constructor(
        public readonly userId: string,
        public readonly fields: UpdateProfileFieldsRaw,
    ) {}
}

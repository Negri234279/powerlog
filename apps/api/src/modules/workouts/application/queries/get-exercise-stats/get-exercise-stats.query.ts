import type { SupportedLocale } from '../../../../../shared/i18n/locale'

/** Per-exercise analytics for the caller, optionally within an ISO date range. */
export class GetExerciseStatsQuery {
    constructor(
        public readonly userId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
        public readonly locale?: SupportedLocale,
    ) {}
}

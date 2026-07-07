import { type SQL, sql } from 'drizzle-orm'

import type { SupportedLocale } from '../../../../../shared/i18n/locale'
import { exerciseTranslations } from '../schema/exercise-translations.schema'
import { exercises } from '../schema/exercises.schema'

/**
 * SQL expression for an exercise's display name in `locale`, falling back to the
 * canonical English `exercises.name` when no translation row exists. A correlated
 * subquery (not a JOIN) so it drops into any query that already selects from
 * `exercises` without disturbing GROUP BY / aggregates. English requests match no
 * row (only non-English locales are stored) and cleanly fall back.
 */
export function localizedExerciseName(locale: SupportedLocale): SQL<string> {
    return sql<string>`coalesce((select ${exerciseTranslations.name} from ${exerciseTranslations} where ${exerciseTranslations.exerciseId} = ${exercises.id} and ${exerciseTranslations.locale} = ${locale}), ${exercises.name})`
}

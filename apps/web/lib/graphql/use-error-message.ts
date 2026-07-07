'use client'

import { ClientError } from 'graphql-request'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

/**
 * Returns a function that turns a GraphQL/network error into a localized,
 * user-safe message. It maps the API's stable `extensions.code` to a translated
 * string (the `serverErrors` namespace); unmapped codes fall back to the API's
 * own (English) message, and non-GraphQL failures — a proxy/API outage — get a
 * clean localized status line. Mirrors `gqlErrorMessage`, but locale-aware, so
 * it must be used from a client component (it's a hook).
 */
export function useErrorMessage() {
    const t = useTranslations('serverErrors')

    return useCallback(
        (error: unknown): string => {
            if (error instanceof ClientError) {
                const first = error.response.errors?.[0]
                const code = typeof first?.extensions?.['code'] === 'string' ? first.extensions['code'] : null
                if (code && t.has(code)) return t(code)
                if (first?.message) return first.message

                const status = error.response.status
                if (status === 404 || status === 502 || status === 503) return t('unreachable')
                return status ? t('httpStatus', { status }) : t('generic')
            }
            return t('generic')
        },
        [t],
    )
}

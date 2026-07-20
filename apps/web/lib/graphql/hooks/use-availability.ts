import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { gqlRequest } from '@/lib/graphql/client'
import { EmailAvailableDocument, UsernameAvailableDocument } from '@/lib/graphql/operations/auth'
import { registerSchema } from '@/lib/validation/auth'

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken'

// Per-field format validators, reused from the register schema so "valid enough
// to ask the server" matches exactly what submit will accept.
const FORMAT = {
    email: registerSchema.shape.email,
    username: registerSchema.shape.username,
}

function useDebounced<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), ms)

        return () => clearTimeout(id)
    }, [value, ms])

    return debounced
}

/**
 * Live "is this free to register?" for email/username. Debounced (450ms) so it
 * fires when the user pauses — not on every keystroke — and only hits the server
 * once the value passes local format validation (no round-trip for obvious
 * garbage; format errors stay the form's own job). `skip` turns it off entirely,
 * e.g. an invite-locked email.
 */
export function useAvailability(kind: 'email' | 'username', value: string, skip = false): AvailabilityStatus {
    const trimmed = value.trim()
    const debounced = useDebounced(trimmed, 450)
    const formatOk = FORMAT[kind].safeParse(debounced).success
    const enabled = !skip && debounced.length > 0 && formatOk

    const { data, isFetching } = useQuery({
        queryKey: ['availability', kind, debounced],
        queryFn: async () =>
            kind === 'email'
                ? (await gqlRequest(EmailAvailableDocument, { email: debounced })).emailAvailable
                : (await gqlRequest(UsernameAvailableDocument, { username: debounced })).usernameAvailable,
        enabled,
        staleTime: 30_000,
        retry: false,
    })

    if (skip || trimmed.length === 0) return 'idle'
    if (trimmed !== debounced) return 'checking' // typing — waiting for the debounce to settle
    if (!formatOk) return 'idle' // let the form's zod validation own format errors
    if (isFetching) return 'checking'
    if (data === true) return 'available'
    if (data === false) return 'taken'

    return 'checking'
}

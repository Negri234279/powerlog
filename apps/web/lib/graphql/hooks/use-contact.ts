import { useMutation } from '@tanstack/react-query'

import type { ContactInput } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import { SendContactMessageDocument } from '@/lib/graphql/operations/support'

/** Public contact form submission. No auth: the mutation is open (rate-limited). */
export function useSendContactMessage() {
    return useMutation({
        mutationFn: (input: ContactInput) =>
            gqlRequest(SendContactMessageDocument, { input }).then((r) => r.sendContactMessage),
    })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MyProfileQuery, UpdateProfileInput } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import { MyProfileDocument, UpdateProfileDocument } from '@/lib/graphql/operations/profile'

export type ProfileData = MyProfileQuery['myProfile']

export function useMyProfile() {
    return useQuery({
        queryKey: ['myProfile'],
        queryFn: async () => (await gqlRequest(MyProfileDocument)).myProfile,
        retry: false,
    })
}

export function useUpdateProfile() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: UpdateProfileInput) => gqlRequest(UpdateProfileDocument, { input }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['myProfile'] })
            void qc.invalidateQueries({ queryKey: ['me'] })
        },
    })
}

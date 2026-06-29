import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MyProfileQuery, UpdateProfileInput } from '@/lib/graphql/__generated__/graphql'
import { removeAvatar, uploadAvatar } from '@/lib/api/avatar'
import { gqlRequest, refreshSession } from '@/lib/graphql/client'
import { MyProfileDocument, UpdateProfileDocument } from '@/lib/graphql/operations/profile'

export type ProfileData = MyProfileQuery['myProfile']

/**
 * After an avatar change, rotate the access token so it carries the new avatar
 * URL (the header reads the avatar from the token), then refresh the cached
 * profile/me queries. The component still calls `router.refresh()` to re-render
 * the server layout that seeds the header from the rotated cookie.
 */
async function onAvatarChanged(qc: ReturnType<typeof useQueryClient>): Promise<void> {
    await refreshSession().catch(() => undefined)
    void qc.invalidateQueries({ queryKey: ['myProfile'] })
    void qc.invalidateQueries({ queryKey: ['me'] })
}

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

/** Uploads a new avatar (multipart REST). `blob` is the prepared WebP. */
export function useUploadAvatar() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (blob: Blob) => uploadAvatar(blob),
        onSuccess: () => onAvatarChanged(qc),
    })
}

/** Removes the avatar, reverting to the initials/default. */
export function useRemoveAvatar() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => removeAvatar(),
        onSuccess: () => onAvatarChanged(qc),
    })
}

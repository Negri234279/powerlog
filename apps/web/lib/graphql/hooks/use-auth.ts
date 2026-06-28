import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    ChangePasswordInput,
    LoginInput,
    MeQuery,
    MySessionsQuery,
    RegisterInput,
    ResetPasswordInput,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    ChangePasswordDocument,
    DeleteAccountDocument,
    ForgotPasswordDocument,
    LoginDocument,
    LogoutDocument,
    MeDocument,
    MySessionsDocument,
    RegisterDocument,
    ResendEmailVerificationDocument,
    ResetPasswordDocument,
    RevokeOtherSessionsDocument,
    RevokeSessionDocument,
    VerifyEmailDocument,
} from '@/lib/graphql/operations/auth'

export type Me = MeQuery['me']
export type SessionData = MySessionsQuery['mySessions'][number]

/** The current user, or an error when no valid session exists (no refresh). */
export function useMe() {
    return useQuery({
        queryKey: ['me'],
        queryFn: async () => (await gqlRequest(MeDocument)).me,
        retry: false,
        staleTime: 60_000,
    })
}

export function useLogin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: LoginInput) => gqlRequest(LoginDocument, { input }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    })
}

export function useRegister() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: RegisterInput) => gqlRequest(RegisterDocument, { input }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    })
}

export function useLogout() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => gqlRequest(LogoutDocument),
        onSuccess: () => qc.clear(),
    })
}

export function useChangePassword() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: ChangePasswordInput) => gqlRequest(ChangePasswordDocument, { input }),
        // hasPassword may flip true (Google-only account setting a password).
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    })
}

/** Verifies an email via the token from the verification link (public). */
export function useVerifyEmail() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (token: string) => gqlRequest(VerifyEmailDocument, { token }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    })
}

export function useResendEmailVerification() {
    return useMutation({
        mutationFn: () => gqlRequest(ResendEmailVerificationDocument),
    })
}

/** Public: requests a reset link. Always resolves (the API never reveals whether
 *  the email exists), so the UI shows the same message regardless. */
export function useForgotPassword() {
    return useMutation({
        mutationFn: (email: string) => gqlRequest(ForgotPasswordDocument, { email }),
    })
}

/** Public: completes a reset with the token from the email link. */
export function useResetPassword() {
    return useMutation({
        mutationFn: (input: ResetPasswordInput) => gqlRequest(ResetPasswordDocument, { input }),
    })
}

/** The caller's active sessions (one per device/family), current one flagged. */
export function useMySessions() {
    return useQuery({
        queryKey: ['mySessions'],
        queryFn: async () => (await gqlRequest(MySessionsDocument)).mySessions,
    })
}

export function useRevokeSession() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => gqlRequest(RevokeSessionDocument, { id }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['mySessions'] }),
    })
}

export function useRevokeOtherSessions() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => gqlRequest(RevokeOtherSessionsDocument),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['mySessions'] }),
    })
}

/** GDPR account deletion: soft-deletes server-side and clears the local cache. */
export function useDeleteAccount() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: () => gqlRequest(DeleteAccountDocument),
        onSuccess: () => qc.clear(),
    })
}

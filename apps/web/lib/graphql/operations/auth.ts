import { graphql } from '@/lib/graphql/__generated__'

export const MeDocument = graphql(`
    query Me {
        me {
            id
            email
            username
            role
            isAdmin
            units
            emailVerified
            hasPassword
            createdAt
        }
    }
`)

export const RegisterDocument = graphql(`
    mutation Register($input: RegisterInput!) {
        register(input: $input) {
            id
        }
    }
`)

export const LoginDocument = graphql(`
    mutation Login($input: LoginInput!) {
        login(input: $input) {
            id
        }
    }
`)

export const LogoutDocument = graphql(`
    mutation Logout {
        logout
    }
`)

export const RefreshDocument = graphql(`
    mutation Refresh {
        refresh {
            id
        }
    }
`)

export const DeleteAccountDocument = graphql(`
    mutation DeleteAccount {
        deleteAccount
    }
`)

export const ChangePasswordDocument = graphql(`
    mutation ChangePassword($input: ChangePasswordInput!) {
        changePassword(input: $input)
    }
`)

export const VerifyEmailDocument = graphql(`
    mutation VerifyEmail($token: String!) {
        verifyEmail(token: $token)
    }
`)

export const ResendEmailVerificationDocument = graphql(`
    mutation ResendEmailVerification {
        resendEmailVerification
    }
`)

export const ForgotPasswordDocument = graphql(`
    mutation ForgotPassword($email: String!) {
        forgotPassword(email: $email)
    }
`)

export const ResetPasswordDocument = graphql(`
    mutation ResetPassword($input: ResetPasswordInput!) {
        resetPassword(input: $input)
    }
`)

export const MySessionsDocument = graphql(`
    query MySessions {
        mySessions {
            id
            current
            userAgent
            ip
            lastUsedAt
        }
    }
`)

export const RevokeSessionDocument = graphql(`
    mutation RevokeSession($id: String!) {
        revokeSession(id: $id)
    }
`)

export const RevokeOtherSessionsDocument = graphql(`
    mutation RevokeOtherSessions {
        revokeOtherSessions
    }
`)

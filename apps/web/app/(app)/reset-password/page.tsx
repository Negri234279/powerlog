import { ResetPasswordForm } from '@/components/auth/reset-password-form'

// Public — the target of the reset email link (?token=…). Reads the token
// server-side and hands it to the client form.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams

    return <ResetPasswordForm token={token ?? null} />
}

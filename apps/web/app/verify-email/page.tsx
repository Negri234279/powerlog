import { VerifyEmailClient } from '@/components/auth/verify-email-client'

// Public page — the target of the verification email link (?token=…). Reads the
// token server-side and hands it to the client component that runs the mutation.
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams

    return <VerifyEmailClient token={token ?? null} />
}

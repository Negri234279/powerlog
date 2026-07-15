import { redirect } from 'next/navigation'

import { RegisterForm } from '@/components/auth/register-form'
import { getSession, hasRefreshCookie } from '@/lib/auth/session'

/**
 * Already-authenticated users are sent to the dashboard instead of the sign-up
 * form (valid access token, or a refresh cookie whose access merely expired).
 * The server check complements the proxy's optimistic redirect.
 */
export default async function RegisterPage() {
    if ((await getSession()) || (await hasRefreshCookie())) {
        redirect('/dashboard')
    }

    return <RegisterForm />
}

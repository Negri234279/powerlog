import { ChangePasswordCard } from '@/components/auth/change-password-card'
import { DeleteAccountCard } from '@/components/auth/delete-account-card'
import { EmailVerificationCard } from '@/components/auth/email-verification-card'
import { SessionsCard } from '@/components/auth/sessions-card'

/** Account & security tab: email verification, password, active sessions and
 *  the destructive delete-account action, kept apart from everyday editing. */
export default function SecurityPage() {
    return (
        <div className="space-y-6">
            <EmailVerificationCard />
            <ChangePasswordCard />
            <SessionsCard />
            <DeleteAccountCard />
        </div>
    )
}

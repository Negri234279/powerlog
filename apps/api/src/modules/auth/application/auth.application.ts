import { BecomeCoachHandler } from './commands/become-coach/become-coach.handler'
import { ChangePasswordHandler } from './commands/change-password/change-password.handler'
import { DeleteAccountHandler } from './commands/delete-account/delete-account.handler'
import { ForgotPasswordHandler } from './commands/forgot-password/forgot-password.handler'
import { LoginHandler } from './commands/login/login.handler'
import { LoginWithGoogleHandler } from './commands/login-with-google/login-with-google.handler'
import { LogoutHandler } from './commands/logout/logout.handler'
import { RefreshSessionHandler } from './commands/refresh-session/refresh-session.handler'
import { RegisterUserHandler } from './commands/register-user/register-user.handler'
import { ResendEmailVerificationHandler } from './commands/resend-email-verification/resend-email-verification.handler'
import { ResetPasswordHandler } from './commands/reset-password/reset-password.handler'
import { RevokeOtherSessionsHandler } from './commands/revoke-other-sessions/revoke-other-sessions.handler'
import { RevokeSessionHandler } from './commands/revoke-session/revoke-session.handler'
import { SetUserAdminHandler } from './commands/set-user-admin/set-user-admin.handler'
import { SetUserRoleHandler } from './commands/set-user-role/set-user-role.handler'
import { SetUserStatusHandler } from './commands/set-user-status/set-user-status.handler'
import { VerifyEmailHandler } from './commands/verify-email/verify-email.handler'
import { CountRegistrationOnUserRegistered } from './event-handlers/count-registration-on-user-registered.handler'
import { PromoteToCoachOnSubscriptionActivated } from './event-handlers/promote-to-coach-on-subscription-activated.handler'
import { SendEmailVerificationOnUserRegistered } from './event-handlers/send-email-verification-on-user-registered.handler'
import { AdminUserDetailHandler } from './queries/admin-user-detail/admin-user-detail.handler'
import { AdminUserStatsHandler } from './queries/admin-user-stats/admin-user-stats.handler'
import { AdminUsersHandler } from './queries/admin-users/admin-users.handler'
import { EmailAvailableHandler } from './queries/email-available/email-available.handler'
import { GetMeHandler } from './queries/get-me/get-me.handler'
import { GetMySessionsHandler } from './queries/get-my-sessions/get-my-sessions.handler'
import { EmailVerificationIssuer } from './services/email-verification-issuer.service'
import { PasswordResetIssuer } from './services/password-reset-issuer.service'
import { SessionIssuer } from './services/session-issuer.service'

/** CQRS command handlers for the auth module. */
export const AUTH_COMMAND_HANDLERS = [
    RegisterUserHandler,
    LoginHandler,
    LoginWithGoogleHandler,
    RefreshSessionHandler,
    LogoutHandler,
    VerifyEmailHandler,
    ResendEmailVerificationHandler,
    ChangePasswordHandler,
    ForgotPasswordHandler,
    ResetPasswordHandler,
    RevokeSessionHandler,
    RevokeOtherSessionsHandler,
    BecomeCoachHandler,
    DeleteAccountHandler,
    SetUserRoleHandler,
    SetUserAdminHandler,
    SetUserStatusHandler,
]

/** CQRS query handlers for the auth module. */
export const AUTH_QUERY_HANDLERS = [
    GetMeHandler,
    GetMySessionsHandler,
    EmailAvailableHandler,
    AdminUsersHandler,
    AdminUserStatsHandler,
    AdminUserDetailHandler,
]

/** Integration-event handlers (react to events on the bus). */
export const AUTH_EVENT_HANDLERS = [
    SendEmailVerificationOnUserRegistered,
    CountRegistrationOnUserRegistered,
    PromoteToCoachOnSubscriptionActivated,
]

/** Application-layer services (not CQRS handlers). */
export const AUTH_APPLICATION_SERVICES = [SessionIssuer, EmailVerificationIssuer, PasswordResetIssuer]

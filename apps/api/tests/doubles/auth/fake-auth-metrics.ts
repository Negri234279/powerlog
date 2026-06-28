import { AuthMetrics } from '../../../src/modules/auth/application/ports/auth-metrics.port'
import type {
    LoginMethod,
    LoginOutcome,
    RefreshOutcome,
    RegistrationMethod,
} from '../../../src/modules/auth/application/ports/auth-metrics.port'

/** Recording AuthMetrics double so tests can assert what was counted. */
export class FakeAuthMetrics extends AuthMetrics {
    readonly logins: { method: LoginMethod; outcome: LoginOutcome }[] = []
    readonly refreshes: RefreshOutcome[] = []
    readonly registrations: RegistrationMethod[] = []

    recordLogin(method: LoginMethod, outcome: LoginOutcome): void {
        this.logins.push({ method, outcome })
    }

    recordRefresh(outcome: RefreshOutcome): void {
        this.refreshes.push(outcome)
    }

    recordRegistration(method: RegistrationMethod): void {
        this.registrations.push(method)
    }
}

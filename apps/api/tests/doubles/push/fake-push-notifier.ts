import { PushNotifier } from '../../../src/push/push-notifier'
import type { PushInput, PushPayload } from '../../../src/push/push.types'

/**
 * Records what each event handler asked to push, so tests assert the behaviour
 * (who gets pushed, and the rendered copy) instead of mocking. `render` resolves a
 * per-locale factory for the given locale, or returns a plain payload as-is.
 */
export class FakePushNotifier extends PushNotifier {
    readonly sends: { userIds: string[]; input: PushInput }[] = []

    async send(userIds: readonly string[], input: PushInput): Promise<void> {
        this.sends.push({ userIds: [...userIds], input })
    }

    /** The payload of the nth send, rendered in `locale`. */
    render(index: number, locale: string): PushPayload {
        const { input } = this.sends[index]!

        return typeof input === 'function' ? input(locale) : input
    }
}

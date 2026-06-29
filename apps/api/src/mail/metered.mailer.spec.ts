import { describe, expect, it } from 'vitest'

import { counterValue, testCounter, testHistogram } from '../../tests/doubles/shared'
import { type EmailMessage, Mailer } from './mailer.port'
import { MeteredMailer } from './metered.mailer'

/** Records sends and optionally fails, to drive the decorator under test. */
class StubMailer extends Mailer {
    readonly sent: EmailMessage[] = []
    constructor(private readonly failWith?: Error) {
        super()
    }
    async send(message: EmailMessage): Promise<string | undefined> {
        if (this.failWith) throw this.failWith
        this.sent.push(message)
        return 'stub-message-id'
    }
}

const newMetric = () => testCounter(['type', 'status'])

const message: EmailMessage = { to: 'rafa@example.com', subject: 'Hi', html: '<p>hi</p>', tag: 'email_verification' }

describe('MeteredMailer', () => {
    it('delegates to the inner transport and counts a successful send by tag', async () => {
        const inner = new StubMailer()
        const metric = newMetric()

        await new MeteredMailer(inner, metric, testHistogram(['type', 'status'])).send(message)

        expect(inner.sent).toHaveLength(1)
        expect(await counterValue(metric, { type: 'email_verification', status: 'sent' })).toBe(1)
    })

    it('counts a failure and rethrows when the transport fails', async () => {
        const metric = newMetric()
        const mailer = new MeteredMailer(
            new StubMailer(new Error('smtp down')),
            metric,
            testHistogram(['type', 'status']),
        )

        await expect(mailer.send(message)).rejects.toThrow('smtp down')
        expect(await counterValue(metric, { type: 'email_verification', status: 'failed' })).toBe(1)
    })

    it('labels untagged emails as unknown', async () => {
        const metric = newMetric()

        await new MeteredMailer(new StubMailer(), metric, testHistogram(['type', 'status'])).send({
            ...message,
            tag: undefined,
        })

        expect(await counterValue(metric, { type: 'unknown', status: 'sent' })).toBe(1)
    })
})

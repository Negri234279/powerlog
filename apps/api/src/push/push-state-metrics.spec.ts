import { describe, expect, it } from 'vitest'

import { InMemoryPushSubscriptionStore } from '../../tests/doubles/push'
import { gaugeValue, testGauge } from '../../tests/doubles/shared/test-gauge'
import { PushStateMetrics } from './push-state-metrics'

type Collectable = { collect: () => Promise<void> }

function sub(endpoint: string) {
    return { userId: 'u', endpoint, p256dh: 'p', auth: 'a', locale: 'en' as const }
}

describe('PushStateMetrics', () => {
    it('samples the subscription count into the gauge on collect', async () => {
        const store = new InMemoryPushSubscriptionStore()
        await store.save(sub('https://push/1'))
        await store.save(sub('https://push/2'))
        const gauge = testGauge()
        new PushStateMetrics(store, gauge)

        await (gauge as unknown as Collectable).collect()

        expect(await gaugeValue(gauge)).toBe(2)
    })

    it('keeps the last value when the store read fails (does not break the scrape)', async () => {
        const store = new InMemoryPushSubscriptionStore()
        store.count = () => Promise.reject(new Error('db down'))
        const gauge = testGauge()
        gauge.set(5)
        new PushStateMetrics(store, gauge)

        await expect((gauge as unknown as Collectable).collect()).resolves.toBeUndefined()

        expect(await gaugeValue(gauge)).toBe(5)
    })
})

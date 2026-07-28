'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { gqlRequest } from '@/lib/graphql/client'
import {
    PushPublicKeyDocument,
    RegisterPushSubscriptionDocument,
    RemovePushSubscriptionDocument,
} from '@/lib/graphql/operations/push'
import { useInstallState } from '@/lib/pwa/use-install-state'

/**
 * The states the notifications toggle can be in — kept as a single enum so the
 * card stays declarative (a switch on `status`) instead of juggling booleans.
 *  - `loading`          still detecting support / current subscription
 *  - `ios-needs-install` iOS in a browser tab: must install to the home screen first
 *  - `unsupported`      the browser has no Web Push
 *  - `unavailable`      the server has no VAPID keys (push is off)
 *  - `denied`           the user blocked notifications in the browser
 *  - `off` / `on`       supported and not / already subscribed on this device
 */
export type PushStatus = 'loading' | 'ios-needs-install' | 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on'

/** VAPID keys travel base64url; `applicationServerKey` wants raw bytes (backed by
 *  a plain ArrayBuffer, so the type is `BufferSource`, not a maybe-shared buffer). */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(normalized)
    const bytes = new Uint8Array(new ArrayBuffer(raw.length))

    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i)
    }

    return bytes
}

const isSupported = (): boolean =>
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/**
 * Owns the Web Push opt-in on this device: detects support, tracks whether a
 * subscription already exists, and drives subscribe/unsubscribe end to end
 * (permission prompt → `pushManager` → the register/remove GraphQL mutations).
 * Returns a status enum plus `enable`/`disable`; the card renders off that.
 */
export function usePushNotifications() {
    const locale = useLocale()
    const { isIOS, isStandalone } = useInstallState()
    const supported = isSupported()

    const [ready, setReady] = useState(false)
    const [subscribed, setSubscribed] = useState(false)
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [busy, setBusy] = useState(false)

    // Null ⇒ the API has no VAPID keys (push disabled server-side). Only asked
    // when the browser could actually use it.
    const { data: publicKey, isLoading: keyLoading } = useQuery({
        queryKey: ['pushPublicKey'],
        queryFn: async () => (await gqlRequest(PushPublicKeyDocument)).pushPublicKey,
        staleTime: Infinity,
        retry: false,
        enabled: supported,
    })

    useEffect(() => {
        if (!supported) {
            setReady(true)
            return
        }

        setPermission(Notification.permission)

        navigator.serviceWorker.ready
            .then((registration) => registration.pushManager.getSubscription())
            .then((subscription) => setSubscribed(subscription !== null))
            .catch(() => undefined)
            .finally(() => setReady(true))
    }, [supported])

    const register = useMutation({
        mutationFn: (input: { endpoint: string; p256dh: string; auth: string; locale: string; userAgent: string }) =>
            gqlRequest(RegisterPushSubscriptionDocument, { input }),
    })

    const remove = useMutation({
        mutationFn: (endpoint: string) => gqlRequest(RemovePushSubscriptionDocument, { endpoint }),
    })

    const enable = useCallback(async () => {
        if (!supported || !publicKey) return

        setBusy(true)
        try {
            const result = await Notification.requestPermission()
            setPermission(result)

            if (result !== 'granted') return

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            })

            const json = subscription.toJSON()
            if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys['auth']) return

            await register.mutateAsync({
                endpoint: json.endpoint,
                p256dh: json.keys['p256dh'],
                auth: json.keys['auth'],
                locale,
                userAgent: navigator.userAgent,
            })

            setSubscribed(true)
        } catch {
            // Best-effort: leave the toggle where it was; the user can retry.
        } finally {
            setBusy(false)
        }
    }, [supported, publicKey, locale, register])

    const disable = useCallback(async () => {
        if (!supported) return

        setBusy(true)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                const { endpoint } = subscription

                await subscription.unsubscribe()
                await remove.mutateAsync(endpoint)
            }

            setSubscribed(false)
        } catch {
            // Best-effort.
        } finally {
            setBusy(false)
        }
    }, [supported, remove])

    const status: PushStatus =
        // iOS in a tab can't subscribe at all — check before "unsupported" so the
        // message tells them to install rather than "not supported".
        isIOS && !isStandalone
            ? 'ios-needs-install'
            : !ready || keyLoading
              ? 'loading'
              : !supported
                ? 'unsupported'
                : !publicKey
                  ? 'unavailable'
                  : permission === 'denied'
                    ? 'denied'
                    : subscribed
                      ? 'on'
                      : 'off'

    return {
        status,
        enable,
        disable,
        busy,
    }
}

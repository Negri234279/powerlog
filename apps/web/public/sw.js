/*
 * powerlog service worker — Web Push only (no offline caching in v1).
 *
 * The API sends a JSON payload of { title, body, url?, tag? } (see the push
 * module's PushPayload). We render it as a notification; a click focuses an open
 * tab (navigating it to the deep link) or opens a new one. `tag` collapses
 * repeats of the same subject — e.g. several messages in one chat — into a single
 * notification instead of a stack.
 */

// Apply worker updates immediately (the API serves sw.js with no-cache, so a
// reload always fetches the newest version).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
    if (!event.data) return

    let payload
    try {
        payload = event.data.json()
    } catch {
        payload = { title: 'powerlog', body: event.data.text() }
    }

    const { title = 'powerlog', body = '', url = '/', tag } = payload

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag,
            data: { url },
        }),
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const target = (event.notification.data && event.notification.data.url) || '/'

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) {
                    if ('navigate' in client) client.navigate(target)
                    return client.focus()
                }
            }

            return self.clients.openWindow(target)
        }),
    )
})

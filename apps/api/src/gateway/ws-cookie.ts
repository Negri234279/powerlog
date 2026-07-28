/**
 * Extract a single cookie value from a raw `Cookie` header. The WS handshake
 * exposes `socket.handshake.headers.cookie` (a raw string), not the parsed
 * `req.cookies` the HTTP guard reads — so we parse just the one name we need,
 * rather than pulling in a cookie library.
 */
export function readCookie(header: string | undefined, name: string): string | undefined {
    if (!header) return undefined

    for (const part of header.split(';')) {
        const eq = part.indexOf('=')
        if (eq === -1) continue

        if (part.slice(0, eq).trim() === name) {
            return decodeURIComponent(part.slice(eq + 1).trim())
        }
    }
    return undefined
}

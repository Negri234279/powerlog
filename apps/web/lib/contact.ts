/**
 * Contact address for the legal/support pages, stored **reversed and split** so the
 * plaintext address never appears contiguously anywhere a scraper reads without
 * running JS — not in the server HTML, not in the next-intl messages blob. Only the
 * reversed halves live in the client bundle; `ObfuscatedEmail` joins and un-reverses
 * them at runtime. Not bulletproof against a JS-executing crawler, but it defeats the
 * common `\S+@\S+` harvesters.
 *
 * To change the address: reverse each half (e.g. in a REPL, `[...'user'].reverse().join('')`).
 */
export const CONTACT_EMAIL = {
    userReversed: '10ojelafar',
    domainReversed: 'se.irgen.golrewop',
} as const

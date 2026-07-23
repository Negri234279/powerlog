'use client'

import { Fragment } from 'react'

import { ObfuscatedEmail } from './obfuscated-email'

/** Placeholder in the message strings where the contact email goes. Left literal in
 *  the JSON (read via `t.raw`, so ICU never parses the braces) and swapped for the
 *  obfuscated link here. */
const EMAIL_TOKEN = '{email}'

/**
 * Renders a policy paragraph, replacing every `{email}` token with the
 * `ObfuscatedEmail` link. Strings without the token render as-is. Safe to render from
 * both server (`PolicyDocument`) and client (`Faq`) — it's a client component itself,
 * so the email stays assembled-in-browser everywhere.
 */
export function PolicyText({ text }: { text: string }) {
    if (!text.includes(EMAIL_TOKEN)) return <>{text}</>

    const parts = text.split(EMAIL_TOKEN)

    return (
        <>
            {parts.map((part, i) => (
                <Fragment key={i}>
                    {i > 0 ? <ObfuscatedEmail /> : null}
                    {part}
                </Fragment>
            ))}
        </>
    )
}

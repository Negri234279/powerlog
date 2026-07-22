/**
 * What a conversation is called, and how it should read.
 *
 * Three cases, and the distinction between them is not cosmetic:
 *
 * - `request` — the athlete's own words. Quoted, because they are a quote.
 * - `name` — the block name the model proposed. **Not** quoted: attributing the
 *   model's words to the user is a small lie the UI shouldn't tell.
 * - `none` — nothing was asked. The caller renders a localized generic, dimmed.
 *   Never blank, never "Untitled", never the draft id.
 */
export type DraftTitle =
    | { kind: 'request'; text: string }
    | { kind: 'name'; text: string }
    | { kind: 'none'; of: 'session' | 'mesocycle' }

export function draftTitle(draft: { title: string | null; name: string | null; kind: string }): DraftTitle {
    const request = draft.title?.trim()
    if (request) return { kind: 'request', text: request }

    const name = draft.name?.trim()
    if (name) return { kind: 'name', text: name }

    return {
        kind: 'none',
        of: draft.kind === 'mesocycle' ? 'mesocycle' : 'session',
    }
}

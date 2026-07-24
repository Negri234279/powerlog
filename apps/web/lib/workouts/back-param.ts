/**
 * Carries a filtered history's query string through a session and back.
 *
 * The editor's "back" is a real link to a fixed route, not the browser's Back —
 * it has to work when the session was opened from a notification or a bookmark,
 * with no history to pop. That makes it lossy by nature: the filters the user
 * had narrowed down live in the *previous* URL, which the session route knows
 * nothing about. So the list hands them forward on the link, and the session
 * hands them back. One extra param, and returning lands on the same view that
 * was left rather than on a reset one.
 */
const BACK = 'back'

/** `?back=…` for a link out of a filtered history (empty when nothing is filtered). */
export function backParam(queryString: string): string {
    return queryString === '' ? '' : `?${BACK}=${encodeURIComponent(queryString)}`
}

/** Rebuild the history href from a `back` param read off the current URL. */
export function backHref(path: string, back: string | null): string {
    return back === null || back === '' ? path : `${path}?${back}`
}

export const BACK_PARAM = BACK

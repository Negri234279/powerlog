/** The name fields every user-shaped GraphQL payload carries. */
export type NamedUser = {
    username: string
    firstName?: string | null
    lastName?: string | null
}

/** "Ana Ruiz" from whichever halves the user filled in; null when neither. */
export function fullName(user: NamedUser): string | null {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ')

    return name === '' ? null : name
}

/**
 * Two letters for an avatar with no image. Prefers the real name's initials
 * ("AR" for Ana Ruiz) and falls back to the handle, so the circle and the title
 * beside it are built from the same thing.
 */
export function initials(user: NamedUser): string {
    const first = user.firstName?.trim() ?? ''
    const last = user.lastName?.trim() ?? ''

    if (first !== '' && last !== '') return `${first[0]}${last[0]}`
    if (first !== '') return first.slice(0, 2)

    return user.username.slice(0, 2)
}

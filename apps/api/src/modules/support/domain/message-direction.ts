/**
 * Direction of a message in a ticket thread: `inbound` from the person who wrote
 * in, `outbound` from staff. Only inbound exists today; outbound is the seam for
 * replying from /admin/contact later.
 */
export const MESSAGE_DIRECTIONS = ['inbound', 'outbound'] as const

export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]

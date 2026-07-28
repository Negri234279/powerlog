/** Small ember pill with the unread-message count. Renders nothing at zero. */
export function UnreadBadge({ count }: { count: number }) {
    if (count <= 0) return null

    return (
        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-bg">
            {count > 99 ? '99+' : count}
        </span>
    )
}

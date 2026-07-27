/** Three pulsing dots shown while the other participant is typing. */
export function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/[0.05] px-3.5 py-3 ring-1 ring-hairline">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="size-1.5 animate-bounce rounded-full bg-text-faint"
                        style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
                    />
                ))}
            </div>
        </div>
    )
}

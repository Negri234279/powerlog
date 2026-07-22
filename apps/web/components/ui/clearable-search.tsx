'use client'

import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { Close, Search } from './icons'
import { TrackedButton } from './tracked'

const NBSP = ' '

/** Read a numeric CSS custom property from :root, with a fallback. */
function cssNum(name: string, fallback: number): number {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
    return Number.isFinite(v) ? v : fallback
}

/** Minimal cubic-bezier(x1,y1,x2,y2) sampler so JS easing matches the CSS vars. */
function bezier(str: string): (t: number) => number {
    const m = String(str).match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/)
    if (!m) return (t) => t
    const [x1, y1, x2, y2] = m.slice(1).map(parseFloat) as [number, number, number, number]
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    return (t) => {
        if (t <= 0) return 0
        if (t >= 1) return 1
        let s = t
        for (let i = 0; i < 8; i++) {
            const dx = ((ax * s + bx) * s + cx) * s - t
            const d = (3 * ax * s + 2 * bx) * s + cx
            if (Math.abs(dx) < 1e-6 || d === 0) break
            s -= dx / d
        }
        return ((ay * s + by) * s + cy) * s
    }
}

/**
 * Search input with the transitions.dev `13-input-clear-dissolve` clear effect:
 * on clearing, the typed text flies down + blurs + fades while a soft per-word
 * white streak ignites under each word and the placeholder falls in from above.
 * Dark-theme tuned (white streaks, `screen` blend). Controlled input.
 */
export function ClearableSearch({
    value,
    onChange,
    placeholder,
    className,
    analyticsId,
    shortcut = false,
    focusRef,
}: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    className?: string
    /** Stable id for this search field; the clear button emits `<id>-clear`. */
    analyticsId: string
    /**
     * Bind `/` to focus this field, and show the key as a hint while it's empty
     * and unfocused. For lists a user searches repeatedly; pointless on touch,
     * so the hint is hidden below `md`.
     */
    shortcut?: boolean
    /** Lets a caller (an empty state, say) put the cursor back in the field. */
    focusRef?: RefObject<(() => void) | null>
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [focused, setFocused] = useState(false)
    const mirrorRef = useRef<HTMLDivElement>(null)
    const placeholderRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const [clearing, setClearing] = useState(false)
    const [mirrorText, setMirrorText] = useState('')

    const hasValue = value.length > 0

    useEffect(() => {
        if (focusRef) focusRef.current = () => inputRef.current?.focus()
    }, [focusRef])

    // `/` is a shortcut, never a hijack: typing a slash into any field — this one
    // included — must insert a slash.
    useEffect(() => {
        if (!shortcut) return

        const onKey = (event: KeyboardEvent) => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return

            const target = event.target as HTMLElement | null
            const tag = target?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

            event.preventDefault()
            inputRef.current?.focus()
        }

        document.addEventListener('keydown', onKey)

        return () => document.removeEventListener('keydown', onKey)
    }, [shortcut])

    function buildGlow(text: string): string {
        const canvas = document.createElement('canvas').getContext('2d')
        const input = inputRef.current
        const wrap = wrapRef.current
        if (!canvas || !input || !wrap) return ''

        canvas.font = getComputedStyle(input).font
        const w = wrap.clientWidth || 280
        const padLeft = parseFloat(getComputedStyle(input).paddingLeft) || 12
        const spread = cssNum('--glow-spread', 1.5)
        const layers: string[] = []
        let x = 0
        text.split(/(\s+)/).forEach((seg) => {
            const segW = canvas.measureText(seg).width
            if (seg.trim()) {
                const cx = padLeft + x + segW / 2
                const hw = Math.max(segW * 0.45, 8) * spread
                ;(
                    [
                        [0, 0.8, 7, 0.22],
                        [hw * 0.45, 0.55, 8, 0.18],
                        [-hw * 0.4, 0.65, 6, 0.16],
                        [hw * 0.15, 0.9, 5, 0.14],
                    ] as const
                ).forEach(([dx, rwm, rh, a]) => {
                    const lx = (((cx + dx) / w) * 100).toFixed(2)
                    layers.push(
                        `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(255,255,255,${a}), transparent)`,
                    )
                })
            }
            x += segW
        })

        return layers.join(', ')
    }

    function runAnimation(text: string, keepFocus: boolean) {
        const root = document.documentElement
        const mirror = mirrorRef.current
        const phold = placeholderRef.current
        const glow = glowRef.current
        const input = inputRef.current
        if (!mirror || !phold || !glow || !input) return

        const total = cssNum('--clear-dur', 1000)
        const outDur = cssNum('--clear-out-dur', 400)
        const inDur = cssNum('--clear-in-dur', 400)
        const outFly = cssNum('--clear-out-fly', 12)
        const inFly = cssNum('--clear-in-fly', 12)
        const blur = cssNum('--clear-blur', 2)
        const delay = cssNum('--glow-delay', 50)
        const peakAt = cssNum('--glow-peak-at', 0.15)
        const gOp = cssNum('--glow-opacity', 0.85)
        const easeOut = bezier(getComputedStyle(root).getPropertyValue('--clear-out-ease'))
        const easeIn = bezier(getComputedStyle(root).getPropertyValue('--clear-in-ease'))

        glow.style.background = buildGlow(text)
        glow.style.opacity = '0'
        phold.style.transform = `translateY(-${inFly}px)`
        phold.style.opacity = '0.9'
        phold.style.filter = `blur(${blur}px)`

        const t0 = performance.now()
        const tick = (now: number) => {
            const el = now - t0
            const eo = easeOut(Math.min(1, el / outDur))
            mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`
            mirror.style.opacity = (1 - eo).toFixed(3)
            mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`

            const ei = easeIn(Math.min(1, el / inDur))
            phold.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`
            phold.style.opacity = (0.9 + ei * 0.1).toFixed(3)
            phold.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`

            let g = 0
            if (el > delay) {
                const gp = Math.min(1, (el - delay) / Math.max(1, total - delay))
                g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt)
            }
            glow.style.opacity = (g * gOp).toFixed(3)

            if (el < total) {
                requestAnimationFrame(tick)
            } else {
                mirror.style.cssText = ''
                phold.style.cssText = ''
                glow.style.opacity = '0'
                glow.style.background = ''
                setClearing(false)
                setMirrorText('')
                if (keepFocus) requestAnimationFrame(() => input.focus({ preventScroll: true }))
            }
        }
        requestAnimationFrame(tick)
    }

    function clear() {
        const text = value
        if (!text || clearing) return

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onChange('')
            return
        }

        const keepFocus = document.activeElement === inputRef.current
        setMirrorText(text)
        setClearing(true)
        onChange('') // clear the controlled value; the mirror keeps the old text
        requestAnimationFrame(() => runAnimation(text, keepFocus))
    }

    // Keep focus on the input when the clear button is pressed.
    const keepFocus = (e: PointerEvent | MouseEvent) => {
        if (document.activeElement === inputRef.current) e.preventDefault()
    }

    return (
        <div
            ref={wrapRef}
            className={cn(
                't-clear rounded-full bg-bg/60 ring-1 ring-hairline transition-colors duration-300 focus-within:ring-ember/50',
                hasValue && 'has-value',
                clearing && 'is-clearing',
                className,
            )}
        >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                // Escape clears what you typed; a second Escape gets you out. The
                // other order would trap a keyboard user who only wanted to leave.
                onKeyDown={(e) => {
                    if (e.key !== 'Escape') return
                    if (hasValue) clear()
                    else inputRef.current?.blur()
                }}
                aria-label={placeholder}
                className="w-full bg-transparent py-1.5 pl-10 pr-9 text-sm text-text caret-ember outline-none"
            />

            {shortcut && !hasValue && !focused ? (
                <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-text-faint md:block"
                >
                    /
                </span>
            ) : null}
            <div ref={mirrorRef} className="t-clear-mirror pl-10 pr-9 text-sm text-text" aria-hidden>
                {(clearing ? mirrorText : value).replace(/ /g, NBSP)}
            </div>
            <div ref={placeholderRef} className="t-clear-placeholder pl-10 text-sm text-text-faint" aria-hidden>
                {placeholder}
            </div>
            <div ref={glowRef} className="t-clear-glow" aria-hidden />
            {hasValue && !clearing ? (
                <TrackedButton
                    analyticsId={`${analyticsId}-clear`}
                    type="button"
                    aria-label="Clear search"
                    onPointerDown={keepFocus}
                    onMouseDown={keepFocus}
                    onClick={clear}
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-text-faint transition-colors duration-200 hover:bg-white/[0.06] hover:text-text"
                >
                    <Close className="size-3.5" />
                </TrackedButton>
            ) : null}
        </div>
    )
}

# powerlog — Web Style Guide

> The single source of design truth for `apps/web`. Tokens here are encoded in
> `app/globals.css` via Tailwind v4 `@theme` (so they exist as utilities like
> `bg-bg`, `text-ember`, `font-display`). Build UI from these — don't hardcode
> hex values or ad-hoc spacing in components.

## 0. Brand

**powerlog** — a precision instrument for serious lifters. The feeling is an
_engineered tool_: obsidian metal, machined edges, a single ember of heat for
energy and PRs. Calm, dark, confident, data-dense — never loud or "fitness-app
cliché" (no neon lime, no stock gym photos, no hype gradients).

- **Voice:** terse, technical, earned. "Train like it's logged."
- **Motif:** _Obsidian & Ember_ — near-black surfaces + a molten amber accent.
- **North star:** Linear's restraint × a strength brand's weight.

## 1. Color

Dark-first. Warm-white text on obsidian; ember reserved for emphasis and a few
data highlights. Keep ember < ~10% of any view.

| Token                | Value                   | Use                                   |
| -------------------- | ----------------------- | ------------------------------------- |
| `--color-bg`         | `#07070A`               | Page background (OLED obsidian)       |
| `--color-bg-elev`    | `#0C0C11`               | Raised sections                       |
| `--color-surface`    | `#101016`               | Card inner core                       |
| `--color-shell`      | `#0A0A0E`               | Card outer shell (double-bezel tray)  |
| `--color-hairline`   | `rgba(255,255,255,.08)` | Hairline borders / rings              |
| `--color-text`       | `#F4F2EE`               | Primary text (warm white)             |
| `--color-text-dim`   | `#9B9BA4`               | Secondary text                        |
| `--color-text-faint` | `#80808A`               | Tertiary / captions (AA ≥4.5:1)       |
| `--color-ember`      | `#FF6A2C`               | Primary accent (CTAs, key highlights) |
| `--color-ember-soft` | `#FF9356`               | Accent hover / gradient stop          |
| `--color-amber`      | `#FFB347`               | Gradient end (ember→amber)            |
| `--color-pr`         | `#5BE49B`               | Positive deltas only (PR / up)        |

- **Signature gradient:** `linear-gradient(135deg, var(--color-ember), var(--color-amber))`.
- **Ember glow:** `0 0 80px -20px rgba(255,106,44,.55)` (hero orbs, active CTA).
- **Mesh orbs:** large, very soft radial ember/amber blurs at `opacity-[0.18]`,
  fixed behind content — never animated on scroll.

## 2. Typography

Three intentional families, loaded with `next/font` and exposed as CSS vars.

| Role    | Family        | Token            | Notes                                            |
| ------- | ------------- | ---------------- | ------------------------------------------------ |
| Display | Space Grotesk | `--font-display` | Headlines. Tight tracking, heavy weight.         |
| UI/body | Geist Sans    | `--font-sans`    | Default. Paragraphs, nav, buttons.               |
| Data    | Geist Mono    | `--font-mono`    | Numerals, eyebrows, labels, stats, code-y micro. |

**Banned:** Inter, Roboto, Arial, Open Sans, Helvetica.

**Scale** (fluid `clamp`, set as utilities `text-display-xl` … via `@theme`):

- `display-xl` — `clamp(3.25rem, 7vw, 7rem)` / line `0.95` / tracking `-0.03em`
- `display` — `clamp(2.5rem, 5vw, 4.5rem)` / line `1.0` / tracking `-0.025em`
- `h2` — `clamp(1.9rem, 3.4vw, 3rem)` / tracking `-0.02em`
- `h3` — `clamp(1.25rem, 2vw, 1.6rem)`
- `body-lg` — `1.125rem` / line `1.6`
- `body` — `1rem` / line `1.65`
- `eyebrow` — `0.6875rem` mono, `uppercase`, tracking `0.24em`, `text-text-faint`

**Numerals:** stats and weights use `font-mono` with `tabular-nums` so columns
align. e1RM/PR figures get the ember accent sparingly.

## 3. Space & Layout

- **Container:** `max-w-[80rem]` centered, `px-6 md:px-8`.
- **Section rhythm:** `py-28 md:py-40`. Let it breathe — macro-whitespace is the
  point. Eyebrow → heading → supporting copy, with generous gaps.
- **Grid:** asymmetric Bento for features (`md:grid-cols-12`, varying spans);
  collapses to single column `< 768px` (`grid-cols-1`, reset spans).
- **Full-height:** `min-h-[100dvh]` (never `h-screen` — iOS jump).

## 4. Surfaces — the Double-Bezel

Never lay a card flat on the page. Every major card/panel is a machined tray:

```
Outer shell  → bg-shell, ring-1 ring-hairline, p-1.5, rounded-[2rem]
  Inner core → bg-surface, shadow-[inset_0_1px_0_rgba(255,255,255,.06)],
               rounded-[calc(2rem-0.375rem)]
```

- **Radii:** cards `rounded-[2rem]` (inner `calc(2rem - .375rem)`); pills
  `rounded-full`; inputs `rounded-2xl`.
- **Borders:** only hairlines (`ring-1 ring-hairline`). No 1px solid gray. No
  harsh dark drop shadows — depth comes from inset highlights + ambient glow.

## 5. Components

- **Eyebrow tag:** `rounded-full ring-1 ring-hairline px-3 py-1` + mono eyebrow
  text, often with a tiny ember dot.
- **Primary CTA (Button-in-Button):** ember pill `rounded-full px-6 py-3`, with a
  trailing arrow nested in its own circle (`size-8 rounded-full bg-black/15`),
  flush to the right padding. Press = `active:scale-[0.98]`; on hover the inner
  circle drifts `translate-x-0.5 -translate-y-px` and scales `105`.
- **Secondary CTA:** ghost pill, `ring-1 ring-hairline`, `hover:bg-white/[0.04]`.
- **Stat chip:** mono numeral + label + optional `text-pr` delta.

## 6. Motion

Physics, not fades. Default curve `cubic-bezier(0.32,0.72,0,1)`, durations
`600–900ms`.

- **Scroll reveal:** `<Reveal>` (IntersectionObserver) — children resolve from
  `translate-y-4 blur-[6px] opacity-0` → `translate-y-0 blur-0 opacity-100`, with
  optional stagger via `delay`. One-shot (no re-trigger).
- **Nav:** floating glass pill detached from top (`mt-5`); mobile hamburger
  morphs to an X and opens a full glass overlay with staggered link reveals.
- **Performance:** animate only `transform`/`opacity`. `backdrop-blur` only on
  fixed/sticky layers (nav, overlay). Grain is a `fixed` `pointer-events-none`
  overlay. Respect `prefers-reduced-motion` (reveals resolve instantly).

## 7. Iconography

Ultra-thin hand-rolled inline SVG (`stroke-width ~1.25`, `currentColor`). No
thick Lucide / FontAwesome / Material. Keep them geometric and quiet.

## 8. Do / Don't

- ✅ Heavy whitespace, hairlines, inset highlights, mono numerals, one ember.
- ✅ Concentric radii on nested surfaces.
- ❌ Neon/lime gym aesthetic, stock photos, harsh shadows, full-width sticky
  navbar glued to the top, `ease-in-out`, three equal Bootstrap columns.

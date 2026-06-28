/**
 * Shared Recharts styling, wired to the design tokens (globals.css) via CSS vars
 * so charts inherit the Obsidian & Ember palette. SVG stroke/fill accept var().
 */
export const CHART = {
    ember: 'var(--color-ember)',
    emberSoft: 'var(--color-ember-soft)',
    amber: 'var(--color-amber)',
    pr: 'var(--color-pr)',
    dim: 'var(--color-text-dim)',
    faint: 'var(--color-text-faint)',
    /** Faint cartesian grid / axis lines. */
    grid: 'rgba(255, 255, 255, 0.06)',
} as const

/** Tick label style shared by every axis. */
export const axisTick = { fill: 'var(--color-text-faint)', fontSize: 11 } as const

/** A value formatter (e.g. weight in the user's units). */
export type ValueFormatter = (value: number) => string

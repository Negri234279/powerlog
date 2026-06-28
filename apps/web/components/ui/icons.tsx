import type { SVGProps } from 'react'

/**
 * Ultra-thin, geometric inline icons (stroke 1.25, currentColor). Hand-rolled to
 * avoid heavy icon sets and keep the premium, quiet line language.
 */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            {...props}
        >
            {children}
        </svg>
    )
}

export const ArrowUpRight = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M7 17 17 7M9 7h8v8" />
    </Icon>
)

export const Bolt = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z" />
    </Icon>
)

export const ChartLine = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M4 4v16h16" />
        <path d="m7 14 3.5-4 3 2.5L20 6" />
    </Icon>
)

export const Target = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.4" />
    </Icon>
)

export const Users = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2.3-4.5" />
    </Icon>
)

export const Scale = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M12 4v16M7 8h10" />
        <path d="M7 8 4 14h6zM17 8l-3 6h6z" />
        <path d="M8.5 20h7" />
    </Icon>
)

export const Calendar = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <rect x="4" y="5" width="16" height="16" rx="2.5" />
        <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
    </Icon>
)

export const Check = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
)

export const Plus = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M12 5v14M5 12h14" />
    </Icon>
)

export const Mail = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
    </Icon>
)

export const Menu = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
)

export const Close = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M6 6 18 18M18 6 6 18" />
    </Icon>
)

export const Search = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-3.6-3.6" />
    </Icon>
)

export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="m6 9 6 6 6-6" />
    </Icon>
)

export const EllipsisVertical = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p} fill="currentColor" stroke="none">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </Icon>
)

/** Stylized barbell plate — the powerlog brand mark. */
export const Mark = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p} strokeWidth={1.4}>
        <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </Icon>
)

export const Pencil = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3z" />
        <path d="M13.5 8 16 10.5" />
    </Icon>
)

export const Trash = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
        <path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
        <path d="M10 11v6M14 11v6" />
    </Icon>
)

export const Shield = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6z" />
        <path d="m9 12 2 2 4-4" />
    </Icon>
)

export const Dumbbell = (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
        <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </Icon>
)

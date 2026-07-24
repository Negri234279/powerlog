import { useTranslations } from 'next-intl'

const CHIP = 'rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest'

/**
 * Where a conversation ended up. Status is the second-strongest signal on a row
 * because it changes what the row *is*: open means "unfinished, go back",
 * accepted means "this is in your training", discarded means "you said no".
 *
 * The mark carries the meaning alongside the colour — ember vs grey is not
 * distinguishable enough on a dim phone in a gym, and never for a colour-blind
 * user. It is `aria-hidden` because the label right next to it already says it.
 */
export function AiDraftStatusChip({ status }: { status: string }) {
    const t = useTranslations('aiHistory.status')

    const tone =
        status === 'open'
            ? 'bg-ember/10 text-ember'
            : status === 'accepted'
              ? 'bg-pr/10 text-pr'
              : 'bg-white/[0.06] text-text-dim'
    const mark = status === 'open' ? '●' : status === 'accepted' ? '✓' : '⊘'

    return (
        <span className={`${CHIP} ${tone} whitespace-nowrap`}>
            <span aria-hidden="true">{mark}</span> {t(status)}
        </span>
    )
}

/** Session plan or training block — always neutral; it is a fact, not a state. */
export function AiDraftKindChip({ kind }: { kind: string }) {
    const t = useTranslations('aiHistory.kind')

    return <span className={`${CHIP} whitespace-nowrap bg-white/[0.06] text-text-dim`}>{t(kind)}</span>
}

/**
 * Who a coach designed this for. Only ever rendered when `athleteId` is set, and
 * the absence of the chip is what marks a draft as the caller's own — cheaper
 * than labelling nine rows out of ten "You".
 *
 * The feed is scoped to drafts the caller *wrote*, so this always reads "for
 * X", never "by X".
 */
export function AiDraftAthleteChip({ name }: { name: string }) {
    const t = useTranslations('aiHistory')

    return (
        <span className={`${CHIP} whitespace-nowrap bg-white/[0.06] text-text-dim`}>{t('forAthlete', { name })}</span>
    )
}

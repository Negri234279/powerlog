'use client'

import { useTranslations } from 'next-intl'

import { TrackedButton } from '@/components/ui/tracked'
import { usePushNotifications } from '@/lib/pwa/use-push-notifications'

/**
 * Per-device Web Push opt-in on the account page. All the browser/permission
 * logic lives in `usePushNotifications`; this renders the right affordance for
 * the current `status` — a toggle when it can subscribe, an explanation (blocked,
 * unsupported, or "install to the home screen first" on iOS) when it can't.
 */
export function NotificationsCard() {
    const t = useTranslations('profile')
    const { status, enable, disable, busy } = usePushNotifications()

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('notificationsEyebrow')}</p>
                <h2 className="mt-3 font-display text-h3 text-text">{t('notificationsTitle')}</h2>
                <p className="mt-3 max-w-lg text-body text-text-dim">{t('notificationsBody')}</p>

                <div className="mt-6">
                    {status === 'loading' ? (
                        <p className="text-sm text-text-faint">{t('notificationsChecking')}</p>
                    ) : null}

                    {status === 'off' ? (
                        <TrackedButton
                            analyticsId="push-enable"
                            type="button"
                            onClick={() => void enable()}
                            disabled={busy}
                            className="rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? t('notificationsWorking') : t('notificationsEnable')}
                        </TrackedButton>
                    ) : null}

                    {status === 'on' ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-pr">{t('notificationsOn')}</span>
                            <TrackedButton
                                analyticsId="push-disable"
                                type="button"
                                onClick={() => void disable()}
                                disabled={busy}
                                className="rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text active:scale-[0.98] disabled:opacity-50"
                            >
                                {busy ? t('notificationsWorking') : t('notificationsDisable')}
                            </TrackedButton>
                        </div>
                    ) : null}

                    {status === 'denied' ? <p className="text-sm text-text-dim">{t('notificationsDenied')}</p> : null}

                    {status === 'unsupported' ? (
                        <p className="text-sm text-text-dim">{t('notificationsUnsupported')}</p>
                    ) : null}

                    {status === 'unavailable' ? (
                        <p className="text-sm text-text-dim">{t('notificationsUnavailable')}</p>
                    ) : null}

                    {status === 'ios-needs-install' ? (
                        <p className="max-w-lg text-sm text-text-dim">{t('notificationsIosInstall')}</p>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

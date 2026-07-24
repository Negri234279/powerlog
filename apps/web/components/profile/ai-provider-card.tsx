'use client'

import { useTranslations } from 'next-intl'
import { type ChangeEvent, type SubmitEvent, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { Field, Input, Select } from '@/components/ui/field'
import { ArrowUpRight } from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import {
    type AiProvider,
    type AiProviderConfig,
    useAiModels,
    useDeleteAiProviderKey,
    useSetAiProviderDefault,
    useSetAiProviderEnabled,
    useSetAiProviderKey,
    useUpdateAiProviderModel,
} from '@/lib/graphql/hooks/use-ai-settings'

/**
 * Where each provider lets you mint an API key. Neither OpenAI nor Anthropic
 * offers an OAuth flow that would let powerlog create the key for you — their
 * consoles are the only supported route — so the least we can do is point
 * straight at the page instead of describing it.
 */
const KEY_CONSOLE_URL: Record<AiProvider, string> = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://platform.claude.com/settings/keys',
}

/**
 * Where each provider shows the account balance and billing. Neither exposes the
 * remaining credit over the API, so the console is the only place to see it — the
 * spend table below is powerlog's own estimate from the tokens it metered.
 */
const BILLING_CONSOLE_URL: Record<AiProvider, string> = {
    openai: 'https://platform.openai.com/settings/organization/billing',
    anthropic: 'https://platform.claude.com/settings/billing',
}

/**
 * One provider's BYOK configuration. Two shapes in one card: a "connect" form
 * when nothing is stored, and the live settings once a key is in place.
 *
 * The key itself is write-only — it is sent, never read back. All the card can
 * show is the last four characters the API returns.
 */
export function AiProviderCard({ provider, config }: { provider: AiProvider; config?: AiProviderConfig }) {
    const t = useTranslations('ai')
    const errorMessage = useErrorMessage()

    const setKey = useSetAiProviderKey()
    const updateModel = useUpdateAiProviderModel()
    const setEnabled = useSetAiProviderEnabled()
    const setDefault = useSetAiProviderDefault()
    const deleteKey = useDeleteAiProviderKey()

    const [replacing, setReplacing] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)

    // Only ask the provider for its model list once a key is actually stored.
    const models = useAiModels(provider, Boolean(config))

    const showKeyForm = !config || replacing

    async function onSubmitKey(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const apiKey = String(new FormData(form).get('apiKey') ?? '').trim()

        setFormError(null)
        try {
            await setKey.mutateAsync({ provider, apiKey })
            track('ai_key_configured', { provider })
            form.reset()
            setReplacing(false)
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    async function onSelectModel(event: ChangeEvent<HTMLSelectElement>) {
        const model = event.target.value === '' ? null : event.target.value

        setFormError(null)
        try {
            await updateModel.mutateAsync({ provider, model })
            track('ai_model_selected', { provider })
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    async function onToggleEnabled() {
        if (!config) return
        const enabled = !config.enabled

        setFormError(null)
        try {
            await setEnabled.mutateAsync({ provider, enabled })
            track('ai_provider_toggled', { provider, action: enabled ? 'enabled' : 'disabled' })
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    async function onMakeDefault() {
        setFormError(null)
        try {
            await setDefault.mutateAsync(provider)
            track('ai_default_provider_changed', { provider })
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    async function onDelete() {
        setFormError(null)
        try {
            await deleteKey.mutateAsync(provider)
            track('ai_key_removed', { provider })
            setConfirmOpen(false)
        } catch (error) {
            setFormError(errorMessage(error))
        }
    }

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <div>
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div>
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                            <h2 className="mt-3 font-display text-h3 text-text">{t(`providers.${provider}.name`)}</h2>
                        </div>

                        {config ? (
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                {config.isDefault ? (
                                    <span className="whitespace-nowrap rounded-full bg-pr/10 px-3 py-1 font-mono text-eyebrow uppercase text-pr">
                                        {t('statusDefault')}
                                    </span>
                                ) : null}
                                <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1 font-mono text-eyebrow uppercase text-text-dim">
                                    {config.enabled ? t('statusActive') : t('statusPaused')}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <p className="mt-3 max-w-lg text-body text-text-dim">{t(`providers.${provider}.body`)}</p>

                    {/* Console links: minting a key, and the balance/billing the API can't return. */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                        <TrackedLink
                            analyticsId={`ai-${provider}-console`}
                            href={KEY_CONSOLE_URL[provider]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-text underline-offset-4 transition-colors duration-300 hover:underline"
                        >
                            {t(`providers.${provider}.getKey`)}
                            <ArrowUpRight className="size-3.5" />
                        </TrackedLink>

                        <TrackedLink
                            analyticsId={`ai-${provider}-billing`}
                            href={BILLING_CONSOLE_URL[provider]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-text-dim underline-offset-4 transition-colors duration-300 hover:text-text hover:underline"
                        >
                            {t('viewBilling')}
                            <ArrowUpRight className="size-3.5" />
                        </TrackedLink>
                    </div>
                </div>

                {config ? (
                    <div className="mt-6 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <Field label={t('storedKey')}>
                                <p className="rounded-2xl bg-bg/60 px-4 py-3 font-mono text-sm text-text-dim ring-1 ring-hairline">
                                    {t('maskedKey', { last4: config.keyLast4 })}
                                </p>
                            </Field>

                            <Field
                                label={t('model')}
                                htmlFor={`${provider}-model`}
                                hint={models.isError ? undefined : t('modelHint')}
                                error={models.isError ? t('modelsError') : undefined}
                            >
                                <Select
                                    id={`${provider}-model`}
                                    value={config.model ?? ''}
                                    onChange={onSelectModel}
                                    disabled={models.isLoading || models.isError || updateModel.isPending}
                                >
                                    <option value="">{models.isLoading ? t('modelsLoading') : t('modelUnset')}</option>
                                    {(models.data ?? []).map((model) => (
                                        <option key={model.id} value={model.id}>
                                            {model.displayName}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <FormError error={formError} />

                        <div className="flex flex-wrap items-center gap-3">
                            {config.isDefault ? null : (
                                <TrackedButton
                                    analyticsId={`ai-${provider}-make-default`}
                                    type="button"
                                    onClick={onMakeDefault}
                                    disabled={setDefault.isPending}
                                    title={t('defaultHint')}
                                    className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                                >
                                    {t('makeDefault')}
                                </TrackedButton>
                            )}

                            <TrackedButton
                                analyticsId={`ai-${provider}-toggle`}
                                type="button"
                                onClick={onToggleEnabled}
                                disabled={setEnabled.isPending}
                                className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
                            >
                                {config.enabled ? t('pause') : t('resume')}
                            </TrackedButton>

                            <TrackedButton
                                analyticsId={`ai-${provider}-replace`}
                                type="button"
                                onClick={() => setReplacing((value) => !value)}
                                className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                            >
                                {replacing ? t('cancel') : t('replaceKey')}
                            </TrackedButton>

                            <TrackedButton
                                analyticsId={`ai-${provider}-remove`}
                                type="button"
                                onClick={() => setConfirmOpen(true)}
                                className="rounded-full px-4 py-2 text-sm text-ember transition-colors duration-300 hover:text-ember/80"
                            >
                                {t('removeKey')}
                            </TrackedButton>
                        </div>
                    </div>
                ) : null}

                {showKeyForm ? (
                    <form onSubmit={onSubmitKey} className="mt-6 max-w-md space-y-4" noValidate>
                        <Field label={t('apiKey')} htmlFor={`${provider}-key`} hint={t('apiKeyHint')}>
                            <Input
                                id={`${provider}-key`}
                                name="apiKey"
                                type="password"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder={t(`providers.${provider}.placeholder`)}
                                required
                            />
                        </Field>

                        {config ? null : <FormError error={formError} />}

                        <SubmitButton analyticsId={`ai-${provider}-save-key`} loading={setKey.isPending}>
                            {config ? t('saveNewKey') : t('connect')}
                        </SubmitButton>
                    </form>
                ) : null}
            </div>

            <ConfirmModal
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={onDelete}
                title={t('removeKeyTitle')}
                description={t('removeKeyBody', { provider: t(`providers.${provider}.name`) })}
                confirmLabel={t('removeKey')}
                cancelLabel={t('cancel')}
                destructive
                pending={deleteKey.isPending}
                analyticsId={`ai-${provider}-remove-confirm`}
            />
        </div>
    )
}

'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useSendContactMessage } from '@/lib/graphql/hooks/use-contact'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/** Ticket categories — must mirror the API's `TICKET_CATEGORIES` enum. */
const CATEGORIES = ['general', 'billing', 'bug', 'account', 'feature', 'other'] as const

/** Field bounds — mirror the API's `contactSchema` so the client fails fast with
 *  the same rules the server enforces (the server stays the authority). */
const LIMITS = {
    name: { min: 1, max: 80 },
    subject: { min: 3, max: 150 },
    message: { min: 10, max: 5000 },
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The form's fields. `website` is a honeypot (see the hidden input below). */
interface ContactValues {
    name: string
    email: string
    category: string
    subject: string
    message: string
    website: string
}

/** Per-field validation messages, plus `form` for a submit/server-level error. */
type Errors = Partial<Record<keyof ContactValues | 'form', string>>

const EMPTY: ContactValues = { name: '', email: '', category: 'general', subject: '', message: '', website: '' }

/**
 * Public contact form → opens a support ticket via the (rate-limited, honeypot-
 * guarded) `sendContactMessage` mutation. All fields are required and validated in
 * JS (native HTML constraints are trivially bypassed); the server re-validates with
 * the same rules and stays the authority. On success the form is replaced by a
 * confirmation (`send.isSuccess`), so a submit can't be double-fired.
 */
export function ContactForm() {
    const t = useTranslations('contact')
    const errorMessage = useErrorMessage()
    const send = useSendContactMessage()

    // One piece of state for the whole form: the field values plus the current
    // errors (by field, `form` for a server error). Success/pending come from the
    // mutation, so there's no extra flag.
    const [form, setForm] = useState<{ value: ContactValues; error: Errors }>({ value: EMPTY, error: {} })

    // Editing a field clears its error (and any prior server error), so a corrected
    // field stops showing red the moment it's touched.
    const set = <K extends keyof ContactValues>(field: K, value: string) =>
        setForm((current) => ({
            value: { ...current.value, [field]: value },
            error: { ...current.error, [field]: undefined, form: undefined },
        }))

    function validate(value: ContactValues): Errors {
        const errors: Errors = {}
        const name = value.name.trim()
        const subject = value.subject.trim()
        const message = value.message.trim()

        if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) errors.name = t('errors.name')
        if (!EMAIL_RE.test(value.email.trim())) errors.email = t('errors.email')
        if (subject.length < LIMITS.subject.min || subject.length > LIMITS.subject.max)
            errors.subject = t('errors.subject')
        if (message.length < LIMITS.message.min || message.length > LIMITS.message.max)
            errors.message = t('errors.message')

        return errors
    }

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        const { value } = form
        const errors = validate(value)
        if (Object.keys(errors).length > 0) {
            setForm((current) => ({ ...current, error: errors }))
            return
        }

        setForm((current) => ({ ...current, error: {} }))
        try {
            await send.mutateAsync({
                name: value.name.trim(),
                email: value.email.trim(),
                category: value.category,
                subject: value.subject.trim(),
                message: value.message.trim(),
                website: value.website,
            })
        } catch (err) {
            setForm((current) => ({ ...current, error: { form: errorMessage(err) } }))
        }
    }

    if (send.isSuccess) {
        return (
            <div>
                <h1 className="font-display text-h2">{t('successTitle')}</h1>
                <p className="mt-5 text-body-lg text-text-dim">{t('successBody')}</p>
            </div>
        )
    }

    const { value, error } = form

    return (
        <div>
            <h1 className="font-display text-h2">{t('title')}</h1>
            <p className="mt-5 text-body-lg text-text-dim">{t('intro')}</p>

            {/* noValidate: the browser's native validation is off — validation is our
                own JS (native constraints are weak and easily bypassed). */}
            <form onSubmit={onSubmit} noValidate className="mt-10 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('nameLabel')} htmlFor="contact-name" error={error.name}>
                        <Input
                            id="contact-name"
                            name="name"
                            autoComplete="name"
                            aria-invalid={error.name ? true : undefined}
                            value={value.name}
                            onChange={(e) => set('name', e.target.value)}
                            placeholder={t('namePlaceholder')}
                        />
                    </Field>
                    <Field label={t('emailLabel')} htmlFor="contact-email" error={error.email}>
                        <Input
                            id="contact-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={error.email ? true : undefined}
                            value={value.email}
                            onChange={(e) => set('email', e.target.value)}
                            placeholder={t('emailPlaceholder')}
                        />
                    </Field>
                </div>

                <Field label={t('categoryLabel')} htmlFor="contact-category">
                    <Select
                        id="contact-category"
                        name="category"
                        value={value.category}
                        onChange={(e) => set('category', e.target.value)}
                    >
                        {CATEGORIES.map((key) => (
                            <option key={key} value={key}>
                                {t(`categories.${key}`)}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label={t('subjectLabel')} htmlFor="contact-subject" error={error.subject}>
                    <Input
                        id="contact-subject"
                        name="subject"
                        aria-invalid={error.subject ? true : undefined}
                        value={value.subject}
                        onChange={(e) => set('subject', e.target.value)}
                        placeholder={t('subjectPlaceholder')}
                    />
                </Field>

                <Field label={t('messageLabel')} htmlFor="contact-message" error={error.message}>
                    <Textarea
                        id="contact-message"
                        name="message"
                        rows={7}
                        aria-invalid={error.message ? true : undefined}
                        value={value.message}
                        onChange={(e) => set('message', e.target.value)}
                        placeholder={t('messagePlaceholder')}
                    />
                </Field>

                {/* Honeypot: off-screen, not announced, skipped by tab. A real user
                    never fills it; a bot that auto-fills every input does, and both
                    the resolver and the mutation drop the submit as spam. */}
                <div aria-hidden className="absolute left-[-9999px] top-[-9999px]">
                    <label htmlFor="contact-website">Website</label>
                    <input
                        id="contact-website"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={value.website}
                        onChange={(e) => set('website', e.target.value)}
                    />
                </div>

                {error.form ? <p className="text-sm text-ember">{error.form}</p> : null}

                <TrackedButton
                    analyticsId="contact-submit"
                    type="submit"
                    disabled={send.isPending}
                    className="rounded-full bg-ember px-6 py-3 text-sm font-medium text-bg transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {send.isPending ? t('sending') : t('send')}
                </TrackedButton>
            </form>
        </div>
    )
}

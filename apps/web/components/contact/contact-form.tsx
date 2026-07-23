'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useSendContactMessage } from '@/lib/graphql/hooks/use-contact'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/** Ticket categories — must mirror the API's `TICKET_CATEGORIES` enum. */
const CATEGORIES = ['general', 'billing', 'bug', 'account', 'feature', 'other'] as const

/**
 * Public contact form → opens a support ticket via the (rate-limited, honeypot-
 * guarded) `sendContactMessage` mutation. On success the form is replaced by a
 * confirmation, so a submit can't be double-fired.
 */
export function ContactForm() {
    const t = useTranslations('contact')
    const errorMessage = useErrorMessage()
    const send = useSendContactMessage()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [category, setCategory] = useState<string>('general')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [website, setWebsite] = useState('') // honeypot
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        try {
            await send.mutateAsync({
                email: email.trim(),
                name: name.trim() || null,
                category,
                subject: subject.trim(),
                message: message.trim(),
                website,
            })
            setDone(true)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    if (done) {
        return (
            <div>
                <h1 className="font-display text-h2">{t('successTitle')}</h1>
                <p className="mt-5 text-body-lg text-text-dim">{t('successBody')}</p>
            </div>
        )
    }

    return (
        <div>
            <h1 className="font-display text-h2">{t('title')}</h1>
            <p className="mt-5 text-body-lg text-text-dim">{t('intro')}</p>

            <form onSubmit={onSubmit} className="mt-10 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('nameLabel')} htmlFor="contact-name">
                        <Input
                            id="contact-name"
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('namePlaceholder')}
                        />
                    </Field>
                    <Field label={t('emailLabel')} htmlFor="contact-email">
                        <Input
                            id="contact-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('emailPlaceholder')}
                        />
                    </Field>
                </div>

                <Field label={t('categoryLabel')} htmlFor="contact-category">
                    <Select
                        id="contact-category"
                        name="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {CATEGORIES.map((key) => (
                            <option key={key} value={key}>
                                {t(`categories.${key}`)}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label={t('subjectLabel')} htmlFor="contact-subject">
                    <Input
                        id="contact-subject"
                        name="subject"
                        required
                        minLength={3}
                        maxLength={150}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t('subjectPlaceholder')}
                    />
                </Field>

                <Field label={t('messageLabel')} htmlFor="contact-message">
                    <Textarea
                        id="contact-message"
                        name="message"
                        required
                        minLength={10}
                        maxLength={5000}
                        rows={7}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('messagePlaceholder')}
                    />
                </Field>

                {/* Honeypot: off-screen, not announced. A real user never fills it. */}
                <div aria-hidden className="absolute left-[-9999px] top-[-9999px]">
                    <label htmlFor="contact-website">Website</label>
                    <input
                        id="contact-website"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                    />
                </div>

                {error ? <p className="text-sm text-ember">{error}</p> : null}

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

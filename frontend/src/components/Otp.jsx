import { useState } from 'react'
import { api } from '../api'
import { Icon } from './icons'
import { Button, Field, Input, toast } from './ui'

/**
 * Email / SMS verification field.
 *
 * When a provider is configured the API sends the code for real and returns no
 * `demo_code`; we then just tell the user to go and check. On a local install
 * with no provider, the API returns the code and we surface it inline so the
 * flow is still walkable.
 */
export function OtpField({ channel, target, value, onChange, label, hint, disabled }) {
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    if (!target?.trim()) {
      return toast.error(`Enter your ${channel === 'email' ? 'email address' : 'mobile number'} first`)
    }
    setBusy(true)
    try {
      const res = await api.post('/auth/otp/request', { channel, target })
      setSent(res)
      toast.success(res.demo_code
        ? 'Code generated — shown below'
        : `Code sent to ${res.target}`)
    } catch (e) {
      toast.error(e.message)
    } finally { setBusy(false) }
  }

  const live = sent && !sent.demo_code

  return (
    <Field label={label} hint={sent ? undefined : hint}>
      <div className="flex gap-2">
        <Input inputMode="numeric" maxLength={6} placeholder="6-digit code"
          value={value} disabled={disabled}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          className="tnum tracking-[0.3em]" />
        <Button type="button" variant="outline" onClick={send} loading={busy} disabled={disabled}
          className="shrink-0" icon={channel === 'email' ? <Icon.Mail size={14} /> : <Icon.Phone size={14} />}>
          {sent ? 'Resend' : 'Send code'}
        </Button>
      </div>

      {live && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-mint-50 px-3 py-2">
          <Icon.Check size={14} className="shrink-0 text-mint-600" />
          <p className="text-[11.5px] leading-snug text-mint-700">
            Sent to <span className="font-extrabold">{sent.target}</span>. Check your{' '}
            {channel === 'email' ? 'inbox (and spam folder)' : 'messages'} — it expires shortly.
          </p>
        </div>
      )}

      {sent?.demo_code && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2">
          <Icon.Info size={14} className="shrink-0 text-gold-600" />
          <p className="text-[11.5px] leading-snug text-gold-800">
            Local mode — no {channel === 'email' ? 'email' : 'SMS'} provider is configured, so
            your code is{' '}
            <button type="button" onClick={() => onChange(sent.demo_code)}
              className="font-mono text-[12.5px] font-extrabold underline decoration-dotted">
              {sent.demo_code}
            </button>{' '}
            (tap to fill).
          </p>
        </div>
      )}
    </Field>
  )
}

import { useState } from 'react'
import { MONO } from '../lib/constants'
import {
  clearCheckoutParams,
  getCheckoutId,
  isCheckoutPaid,
  useCheckoutSession,
  usePortal,
} from '../lib/checkout'

const btnSolid: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#FAFAFA',
  color: '#0A0A0A',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 500,
  padding: '13px 24px',
  borderRadius: 6,
  minHeight: 44,
  boxSizing: 'border-box',
  transition: 'background 0.2s, transform 0.2s',
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: '#FAFAFA',
  border: '1px solid #27272A',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 500,
  padding: '13px 24px',
  borderRadius: 6,
  minHeight: 44,
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, background 0.2s',
}

function Ring({ tone }: { tone: 'success' | 'error' }) {
  const color = tone === 'success' ? '#4ADE80' : '#F87171'
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        background: tone === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 28px',
        animation: 'kfResultPop 0.5s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {tone === 'success' ? <path d="M20 6 9 17l-5-5" /> : <><path d="M18 6 6 18" /><path d="M6 6l12 12" /></>}
      </svg>
    </div>
  )
}

function GuideStep({ n, title, body, last }: { n: number; title: string; body: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, textAlign: 'left' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid #3F3F46',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: MONO,
            fontSize: 12,
            color: '#FAFAFA',
            flex: 'none',
          }}
        >
          {n}
        </span>
        {!last && <span style={{ width: 1, flex: 1, background: '#27272A', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 16 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#FAFAFA', marginBottom: 3 }}>{title}</div>
        <p style={{ margin: 0, color: '#A1A1AA', fontSize: 13.5, lineHeight: 1.55 }}>{body}</p>
      </div>
    </div>
  )
}

function formatAmount(session: { totalAmount?: number | null; amount?: number | null; currency?: string | null }) {
  const cents = session.totalAmount ?? session.amount
  if (cents == null) return null
  const symbol = (session.currency ?? 'usd').toUpperCase() === 'USD' ? '$' : ''
  return `${symbol}${(cents / 100).toFixed(2)}`
}

export function CheckoutResult() {
  const [checkoutId] = useState(getCheckoutId)
  const [open, setOpen] = useState(Boolean(checkoutId))

  const { data, isLoading, isError, error } = useCheckoutSession(checkoutId)
  const portal = usePortal()

  if (!checkoutId || !open) return null

  const close = () => {
    clearCheckoutParams()
    setOpen(false)
  }

  const paid = data ? isCheckoutPaid(data.status) : false
  const amount = data ? formatAmount(data) : null
  const productName = data?.product?.name ?? 'Your template'

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.86)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'kfResultFade 0.3s ease both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) close()
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          background: '#0A0A0A',
          border: '1px solid #27272A',
          borderRadius: 16,
          padding: 'clamp(32px, 5vw, 48px)',
          textAlign: 'center',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          animation: 'kfResultIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 16,
            backgroundImage: 'radial-gradient(circle, #1C1C1F 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: 0.5,
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 10%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 10%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          {isLoading ? (
            <>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '2px solid #27272A',
                  borderTopColor: '#FAFAFA',
                  margin: '0 auto 24px',
                  animation: 'kfSpin 0.8s linear infinite',
                }}
              />
              <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.04em', color: '#A1A1AA' }}>
                Verifying your purchase…
              </div>
            </>
          ) : isError ? (
            <>
              <Ring tone="error" />
              <h2 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
                Something went wrong.
              </h2>
              <p style={{ margin: '0 0 28px', color: '#A1A1AA', fontSize: 15, lineHeight: 1.6 }}>
                {error instanceof Error ? error.message : 'We could not confirm your checkout.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                <button type="button" className="btn-ghost-dark" style={btnGhost} onClick={close}>
                  Back to site
                </button>
              </div>
            </>
          ) : paid ? (
            <>
              <Ring tone="success" />
              <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: '#4ADE80', marginBottom: 14 }}>
                PAYMENT CONFIRMED{amount ? ` · ${amount}` : ''}
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: 'clamp(28px, 4vw, 34px)', fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
                You're in.
              </h2>
              <p style={{ margin: '0 0 28px', color: '#A1A1AA', fontSize: 15, lineHeight: 1.6 }}>
                {productName} is yours. One last step gets you the code — connect GitHub in your
                Polar portal and the private repo is added to your account.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28, textAlign: 'left' }}>
                <GuideStep
                  n={1}
                  title="Open your Polar portal"
                  body="The button below takes you straight to your customer dashboard."
                />
                <GuideStep
                  n={2}
                  title="Connect your GitHub account"
                  body="Under Benefits, link GitHub — Polar invites you to the private repository automatically."
                />
                <GuideStep
                  n={3}
                  title="Accept the invite & clone"
                  body="Check your email for the repo invite, then clone, configure .env, and ship."
                  last
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn-white"
                  style={{ ...btnSolid, border: 'none', cursor: 'pointer', opacity: portal.isPending ? 0.7 : 1 }}
                  onClick={() => portal.mutate({ returnUrl: window.location.origin })}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? 'Opening…' : 'Open Polar portal →'}
                </button>
                <button type="button" className="btn-ghost-dark" style={btnGhost} onClick={close}>
                  Back to site
                </button>
              </div>
              {data?.customerEmail && (
                <p style={{ margin: '20px 0 0', fontFamily: MONO, fontSize: 12, color: '#52525B' }}>
                  Receipt sent to {data.customerEmail}
                </p>
              )}
            </>
          ) : (
            <>
              <Ring tone="error" />
              <h2 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
                Payment didn't go through.
              </h2>
              <p style={{ margin: '0 0 28px', color: '#A1A1AA', fontSize: 15, lineHeight: 1.6 }}>
                {data?.status === 'expired'
                  ? 'This checkout session expired. Start again to grab your template.'
                  : 'Your checkout was not completed. No charge was made — give it another try.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn-white"
                  style={{ ...btnSolid, border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    close()
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Try again
                </button>
                <button type="button" className="btn-ghost-dark" style={btnGhost} onClick={close}>
                  Back to site
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

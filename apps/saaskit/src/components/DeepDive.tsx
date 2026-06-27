import type { ReactNode } from 'react'
import { MONO } from '../lib/constants'

function DeepDiveRow({
  reverse,
  eyebrowText,
  title,
  body,
  fileLabel,
  code,
}: {
  reverse?: boolean
  eyebrowText: string
  title: string
  body: string
  fileLabel: string
  code: ReactNode
}) {
  return (
    <div
      data-reveal
      style={{
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        padding: '0 clamp(20px, 4vw, 32px)',
        display: 'flex',
        flexWrap: reverse ? 'wrap-reverse' : 'wrap',
        flexDirection: reverse ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 'clamp(36px, 5vw, 80px)',
      }}
    >
      <div style={{ flex: 1, minWidth: 'min(100%, 340px)' }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.16em', color: '#71717A', marginBottom: 16 }}>{eyebrowText}</div>
        <h3 style={{ margin: '0 0 14px', fontSize: 'clamp(26px, 2.8vw, 36px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.12 }}>{title}</h3>
        <p style={{ margin: 0, color: '#71717A', fontSize: 16.5, lineHeight: 1.65, textWrap: 'pretty' }}>{body}</p>
      </div>
      <div style={{ flex: 1.15, minWidth: 'min(100%, 360px)' }}>
        <div style={{ background: '#0A0A0A', border: '1px solid #27272A', borderRadius: 8, overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,0.18)' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #27272A', fontFamily: MONO, fontSize: 12, color: '#71717A' }}>{fileLabel}</div>
          <pre style={{ margin: 0, padding: '20px 22px 24px', fontFamily: MONO, fontSize: 13, lineHeight: 1.9, color: '#A1A1AA', overflowX: 'auto' }}>{code}</pre>
        </div>
      </div>
    </div>
  )
}

export function DeepDive() {
  const W = '#FAFAFA'
  const S = '#D4D4D8'
  const C = '#52525B'
  return (
    <section
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
        borderTop: '1px solid #E4E4E7',
        padding: 'clamp(80px, 10vw, 128px) 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(64px, 8vw, 112px)',
      }}
    >
      <DeepDiveRow
        eyebrowText="POLAR · WEBHOOKS · PORTAL"
        title="Payments that just work."
        body="Checkout, webhooks, and the billing portal are pre-tested and typed. A subscription event lands, your database updates, your UI reflects it — without you writing the glue."
        fileLabel="services/auth/auth.ts — Polar plugin"
        code={
          <>
            <span style={{ color: W }}>polar</span>({'{'}{'\n'}
            {'  '}use: [{'\n'}
            {'    '}webhooks({'{'}{'\n'}
            {'      '}secret: env.POLAR_WEBHOOK_SECRET,{'\n'}
            {'      '}onSubscriptionCreated: <span style={{ color: W }}>async</span> ({'{ data }'}) =&gt;{'\n'}
            {'        '}createSubscription(data),{'\n'}
            {'    }'}),{'\n'}
            {'  ],'}{'\n'}
            {'})'}
          </>
        }
      />
      <DeepDiveRow
        reverse
        eyebrowText="BETTER AUTH · SESSIONS"
        title="Auth without the headache."
        body="Sessions, protected routes, and a working sign-in flow ship in the box. Email, OAuth providers, and account linking are a config entry — not a sprint."
        fileLabel="app/admin/layout.tsx"
        code={
          <>
            <span style={{ color: C }}>// admin routes guarded by session + role</span>{'\n'}
            <span style={{ color: W }}>const</span> user = <span style={{ color: W }}>await</span> auth.api.getSession({'{'}{'\n'}
            {'  '}headers: <span style={{ color: W }}>await</span> headers(),{'\n'}
            {'});'}{'\n'}
            <span style={{ color: W }}>if</span> (!user) redirect(<span style={{ color: S }}>"/login"</span>);{'\n'}
            <span style={{ color: W }}>if</span> (user.user.role !== <span style={{ color: S }}>"admin"</span>) notFound();
          </>
        }
      />
      <DeepDiveRow
        eyebrowText="STRICT TYPES · CLEAN STRUCTURE"
        title="Designed to extend."
        body="Every feature has an obvious home. Strict TypeScript and a deliberately boring folder structure mean adding your own code feels like following a path, not clearing one."
        fileLabel="services/teams/router.ts — your first feature"
        code={
          <>
            <span style={{ color: C }}>// drop a folder in services/, add a tRPC router, done</span>{'\n'}
            <span style={{ color: W }}>export const</span> teamsRouter = createTRPCRouter({'{'}{'\n'}
            {'  '}create: authenticatedProcedure{'\n'}
            {'    '}.input(teamSchema){'\n'}
            {'    '}.mutation(({'{ input, ctx }'}) =&gt;{'\n'}
            {'      '}db.insert(teams).values({'{ ...input, ownerId: ctx.user.id }'})),{'\n'}
            {'});'}
          </>
        }
      />
    </section>
  )
}

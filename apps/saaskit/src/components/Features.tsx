import type { CSSProperties, ReactNode } from 'react'
import { MONO } from '../lib/constants'
import { container, eyebrow, h2Style } from '../lib/styles'

const bentoCardStyle = (gridColumn?: string): CSSProperties => ({
  gridColumn,
  border: '1px solid #E4E4E7',
  borderRadius: 8,
  padding: 18,
  background: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  transition: 'border-color 0.2s',
})

function BentoMeta({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: '#A1A1AA', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ margin: 0, color: '#71717A', fontSize: 14.5, lineHeight: 1.6 }}>{body}</p>
    </div>
  )
}

export function Features({ span2, cols }: { span2: string; cols: string }) {
  const monoChip: CSSProperties = {
    fontFamily: MONO,
    fontSize: 10.5,
    color: '#52525B',
  }
  return (
    <section
      id="features"
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
        borderTop: '1px solid #E4E4E7',
        padding: 'clamp(80px, 10vw, 128px) 0',
      }}
    >
      <div style={container()}>
        <div data-reveal style={{ maxWidth: 640, marginBottom: 'clamp(40px, 5vw, 64px)' }}>
          <div style={{ ...eyebrow('#71717A'), marginBottom: 18 }}>EVERYTHING WIRED IN</div>
          <h2 style={h2Style}>The boring parts, already done.</h2>
          <p style={{ margin: 0, color: '#71717A', fontSize: 17, lineHeight: 1.6, textWrap: 'pretty' }}>
            Every integration below ships configured, typed, and tested — so the first line of code
            you write is your product.
          </p>
        </div>

        <div data-reveal style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>
          {/* 01 AUTH — span 2 */}
          <div className="bento-card" style={bentoCardStyle(span2)}>
            <div
              style={{
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px 18px',
                padding: 16,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 6,
                  padding: 14,
                  width: 168,
                  flex: 'none',
                  boxShadow: '0 8px 24px rgba(10,10,10,0.06)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Sign in</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #E4E4E7', borderRadius: 4, padding: '6px 9px', ...monoChip }}>
                    <span style={{ width: 8, height: 8, background: '#0A0A0A', borderRadius: '50%', flex: 'none' }} />
                    Continue with Google
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #E4E4E7', borderRadius: 4, padding: '6px 9px', ...monoChip }}>
                    <span style={{ width: 8, height: 8, border: '1px solid #0A0A0A', borderRadius: 2, flex: 'none' }} />
                    Email &amp; password
                  </div>
                  <div style={{ height: 1, background: '#E4E4E7', margin: '3px 0' }} />
                  <div style={{ border: '1px solid #E4E4E7', borderRadius: 4, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: '#A1A1AA' }}>
                    Email a login code
                  </div>
                </div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 14, color: '#A1A1AA', flex: 'none' }}>→</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}>
                {[
                  ['session created', 0],
                  ['cookie set', 1.2],
                  ['user synced to db', 2.4],
                ].map(([text, delay]) => (
                  <div
                    key={text as string}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      background: '#FFFFFF',
                      border: '1px solid #E4E4E7',
                      borderRadius: 4,
                      padding: '6px 10px',
                      ...monoChip,
                      animation: 'kfPulse 3.6s ease-in-out infinite',
                      animationDelay: `${delay}s`,
                    }}
                  >
                    <span style={{ color: '#71717A' }}>✓</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <BentoMeta
              label="01 — AUTH"
              title="Authentication"
              body="Email, OAuth, and sessions handled by Better Auth — a working sign-in flow on day one."
            />
          </div>

          {/* 02 PAYMENTS — span 2 */}
          <div className="bento-card" style={bentoCardStyle(span2)}>
            <div
              style={{
                background: '#0A0A0A',
                border: '1px solid #27272A',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 18,
                padding: '20px 24px',
              }}
            >
              <div style={{ position: 'relative', height: 40 }}>
                <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 1, background: '#27272A' }} />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(50% - 3px)',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#FAFAFA',
                    animation: 'kfTravel 3.4s linear infinite',
                  }}
                />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  {['checkout', 'webhook', 'db update'].map((t) => (
                    <span
                      key={t}
                      style={{
                        background: '#111113',
                        border: '1px solid #27272A',
                        borderRadius: 4,
                        padding: '6px 10px',
                        fontFamily: MONO,
                        fontSize: 10.5,
                        color: '#A1A1AA',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#52525B' }}>
                subscription.active → users.plan = <span style={{ color: '#A1A1AA' }}>"pro"</span>
              </div>
            </div>
            <BentoMeta
              label="02 — PAYMENTS"
              title="Payments"
              body="Polar checkout and webhooks, pre-tested end to end — an event lands, your database updates."
            />
          </div>

          {/* 03 DATABASE — span 1 */}
          <div className="bento-card" style={bentoCardStyle()}>
            <div
              style={{
                background: '#0A0A0A',
                border: '1px solid #27272A',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                padding: '16px 18px',
                fontFamily: MONO,
                fontSize: 11,
                lineHeight: 2,
                color: '#A1A1AA',
              }}
            >
              <div style={{ fontSize: 10, color: '#52525B', marginBottom: 6 }}>drizzle/schema.ts</div>
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FAFAFA' }}>const</span> users = pgTable(<span style={{ color: '#D4D4D8' }}>"users"</span>)
              </div>
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FAFAFA' }}>const</span> sessions = pgTable(<span style={{ color: '#D4D4D8' }}>"sessions"</span>)
              </div>
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FAFAFA' }}>const</span> subs = pgTable(<span style={{ color: '#D4D4D8' }}>"subs"</span>)
                <span style={{ display: 'inline-block', width: 6, height: 12, background: '#FAFAFA', verticalAlign: -2, marginLeft: 2, animation: 'blink 1.1s step-end infinite' }} />
              </div>
              <div style={{ marginTop: 6, color: '#52525B', whiteSpace: 'nowrap' }}>
                → pushed to Neon <span style={{ color: '#A1A1AA' }}>in 0.8s</span>
              </div>
            </div>
            <BentoMeta
              label="03 — DATABASE"
              title="Database"
              body="Type-safe Drizzle schema on Neon Postgres, migrations ready to extend."
            />
          </div>

          {/* 04 TYPE-SAFE API — span 1 */}
          <div className="bento-card" style={bentoCardStyle()}>
            <div
              style={{
                background: '#0A0A0A',
                border: '1px solid #27272A',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                fontFamily: MONO,
                fontSize: 11,
                lineHeight: 2,
                color: '#A1A1AA',
              }}
            >
              <div
                style={{
                  alignSelf: 'flex-start',
                  marginLeft: 64,
                  marginBottom: 8,
                  background: '#FAFAFA',
                  color: '#0A0A0A',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  animation: 'kfFloat 3s ease-in-out infinite',
                }}
              >
                data: Order[]
              </div>
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FAFAFA' }}>const</span> {'{ data }'} = useQuery(
              </div>
              <div style={{ whiteSpace: 'nowrap' }}>{'  '}orders.list()</div>
              <div style={{ whiteSpace: 'nowrap' }}>)</div>
              <div style={{ marginTop: 6, color: '#52525B', whiteSpace: 'nowrap' }}>// inferred, server → client</div>
            </div>
            <BentoMeta
              label="04 — API"
              title="Type-safe API"
              body="End-to-end types from server to client, with React Query on the front."
            />
          </div>

          {/* 05 DASHBOARD UI — span 2 */}
          <div className="bento-card" style={bentoCardStyle(span2)}>
            <div
              style={{
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div style={{ width: 54, flex: 'none', borderRight: '1px solid #E4E4E7', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span style={{ width: 10, height: 10, background: '#0A0A0A', display: 'inline-block', marginBottom: 4 }} />
                <span style={{ height: 5, background: '#D4D4D8', borderRadius: 2 }} />
                <span style={{ height: 5, background: '#E4E4E7', borderRadius: 2 }} />
                <span style={{ height: 5, background: '#E4E4E7', borderRadius: 2 }} />
                <span style={{ height: 5, background: '#E4E4E7', borderRadius: 2 }} />
              </div>
              <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    ['MRR', '$8,210'],
                    ['USERS', '1,402'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ flex: 1, border: '1px solid #E4E4E7', background: '#FFFFFF', borderRadius: 4, padding: '8px 10px' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: '#A1A1AA', marginBottom: 5 }}>{k}</div>
                      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 7, minHeight: 0 }}>
                  {[
                    [42, 0.25, 0],
                    [58, 0.35, 0.3],
                    [48, 0.45, 0.6],
                    [70, 0.6, 0.9],
                    [62, 0.75, 1.2],
                    [88, 0.9, 1.5],
                  ].map(([h, op, delay], i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        background: '#0A0A0A',
                        opacity: op,
                        borderRadius: '2px 2px 0 0',
                        transformOrigin: 'bottom',
                        animation: 'kfGrow 3.2s ease-in-out infinite alternate',
                        animationDelay: `${delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <BentoMeta
              label="05 — ADMIN"
              title="Admin dashboard"
              body="A real admin built on shadcn/ui — users, products, media and logs, with MRR and churn at a glance."
            />
          </div>

          {/* 06 BILLING — span 1 */}
          <div className="bento-card" style={bentoCardStyle()}>
            <div
              style={{
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: 6,
                  padding: '13px 14px',
                  width: '100%',
                  maxWidth: 190,
                  boxShadow: '0 8px 24px rgba(10,10,10,0.06)',
                }}
              >
                {[
                  ['PLAN', <span key="p" style={{ color: '#0A0A0A', fontWeight: 600, whiteSpace: 'nowrap' }}>Pro</span>, true],
                  ['STATUS', <span key="s" style={{ color: '#52525B', whiteSpace: 'nowrap', animation: 'kfPulse 3s ease-in-out infinite' }}>● active</span>, true],
                  ['RENEWS', <span key="r" style={{ color: '#0A0A0A', whiteSpace: 'nowrap' }}>Jul 12</span>, false],
                ].map(([k, v, border], i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: MONO,
                      fontSize: 10.5,
                      padding: '5px 0',
                      borderBottom: border ? '1px solid #F4F4F5' : 'none',
                    }}
                  >
                    <span style={{ color: '#A1A1AA', whiteSpace: 'nowrap' }}>{k as string}</span>
                    {v as ReactNode}
                  </div>
                ))}
                <div style={{ marginTop: 9, background: '#0A0A0A', color: '#FAFAFA', borderRadius: 4, padding: '7px 0', textAlign: 'center', fontFamily: MONO, fontSize: 10 }}>
                  Manage billing
                </div>
              </div>
            </div>
            <BentoMeta
              label="06 — BILLING"
              title="Billing & subscriptions"
              body="Plans, upgrades, and the customer portal — wired to your database."
            />
          </div>

          {/* 07 EMAIL — span 1 */}
          <div className="bento-card" style={bentoCardStyle()}>
            <div
              style={{
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 10,
                padding: '16px 18px',
              }}
            >
              {[
                ['#0A0A0A', '100%', 'VERIFY', 0],
                ['#52525B', '78%', 'RESET', 1.4],
                ['#A1A1AA', '60%', 'WELCOME', 2.8],
              ].map(([dot, w, tag, delay], i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: 4,
                    padding: '9px 11px',
                    animation: 'kfPulse 4.2s ease-in-out infinite',
                    animationDelay: `${delay}s`,
                  }}
                >
                  <span style={{ width: 6, height: 6, background: dot as string, borderRadius: '50%', flex: 'none' }} />
                  <span style={{ flex: 1, height: 5, background: '#E4E4E7', borderRadius: 2, maxWidth: w as string }} />
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: '#71717A', border: '1px solid #E4E4E7', borderRadius: 3, padding: '2px 6px', flex: 'none' }}>
                    {tag as string}
                  </span>
                </div>
              ))}
            </div>
            <BentoMeta
              label="07 — EMAIL"
              title="Transactional email"
              body="React Email templates sent through AWS SES — verify, reset, welcome — every send logged."
            />
          </div>

          {/* 08 DEPLOY — span 2 */}
          <div className="bento-card" style={bentoCardStyle(span2)}>
            <div
              style={{
                background: '#0A0A0A',
                border: '1px solid #27272A',
                borderRadius: 6,
                height: 176,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 14,
                padding: '20px 26px',
                fontFamily: MONO,
                fontSize: 12.5,
              }}
            >
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#52525B' }}>$</span> <span style={{ color: '#FAFAFA' }}>saaskit deploy</span>
              </div>
              <div style={{ height: 4, background: '#18181B', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#FAFAFA', borderRadius: 2, animation: 'kfFill 3.6s ease-in-out infinite' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#A1A1AA', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#FAFAFA', marginRight: 8, animation: 'kfPulse 2.4s ease-in-out infinite' }} />
                  live — saaskit.app
                </span>
                <span style={{ color: '#52525B', fontSize: 11, whiteSpace: 'nowrap' }}>build 38s · edge</span>
              </div>
            </div>
            <BentoMeta
              label="08 — DEPLOY"
              title="One-command deploy"
              body="Ship to Vercel in minutes. Env validation tells you what's missing."
            />
          </div>
        </div>

        <div
          data-reveal
          style={{
            marginTop: 16,
            border: '1px solid #E4E4E7',
            borderRadius: 8,
            background: '#FAFAFA',
            padding: '18px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px 14px',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: '#A1A1AA', flex: 'none' }}>
            ALSO INCLUDED
          </span>
          {[
            'File storage — Cloudflare R2',
            'Blog — content-collections',
            'Contact form',
            'Activity log & audit trail',
            'Rate limiting',
          ].map((item) => (
            <span
              key={item}
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                color: '#52525B',
                background: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: 4,
                padding: '6px 10px',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

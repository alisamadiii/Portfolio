import { useState, type CSSProperties, type ReactNode } from 'react'
import { MONO } from '../lib/constants'
import { container, eyebrow, h2Style } from '../lib/styles'

const codeLine = (num: number, content: ReactNode) => (
  <div style={{ display: 'flex' }} key={num}>
    <span style={{ width: 44, flex: 'none', color: '#3F3F46', textAlign: 'right', paddingRight: 18, userSelect: 'none' }}>{num}</span>
    <span style={{ whiteSpace: 'pre', paddingRight: 22 }}>{content}</span>
  </div>
)

export function Architecture() {
  const [tab, setTab] = useState<'full' | 'mono'>('full')
  const full = tab === 'full'
  const panelStyle: CSSProperties = {
    background: '#111113',
    border: '1px solid #27272A',
    borderRadius: 8,
    overflow: 'hidden',
  }
  const panelHeader: CSSProperties = {
    padding: '12px 18px',
    borderBottom: '1px solid #27272A',
    fontFamily: MONO,
    fontSize: 12,
    color: '#71717A',
  }
  const treePre: CSSProperties = {
    margin: 0,
    padding: '22px 22px 26px',
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 1.9,
    color: '#A1A1AA',
    overflowX: 'auto',
  }
  const codeBody: CSSProperties = {
    padding: '22px 0 26px',
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 1.9,
    color: '#A1A1AA',
    overflowX: 'auto',
    flex: 1,
  }
  const W = '#FAFAFA'
  const S = '#D4D4D8'

  return (
    <section
      id="architecture"
      style={{
        background: '#0A0A0A',
        color: '#FAFAFA',
        borderTop: '1px solid #27272A',
        padding: 'clamp(80px, 10vw, 128px) 0',
      }}
    >
      <div style={container()}>
        <div data-reveal style={{ maxWidth: 680, marginBottom: 'clamp(36px, 4vw, 56px)' }}>
          <div style={{ ...eyebrow('#71717A'), marginBottom: 18 }}>LOOK INSIDE</div>
          <h2 style={h2Style}>Clean architecture you'll actually want to build on.</h2>
          <p style={{ margin: 0, color: '#A1A1AA', fontSize: 17, lineHeight: 1.6 }}>
            Sensible structure, strict types, no mystery magic.
          </p>
        </div>

        <div data-reveal>
          <div style={{ display: 'inline-flex', gap: 8, marginBottom: 24, background: '#111113', border: '1px solid #27272A', borderRadius: 6, padding: 4 }}>
            {(['full', 'mono'] as const).map((t) => {
              const isActive = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    background: isActive ? '#FAFAFA' : 'transparent',
                    color: isActive ? '#0A0A0A' : '#71717A',
                    border: 'none',
                    borderRadius: 4,
                    fontFamily: MONO,
                    fontSize: 12.5,
                    letterSpacing: '0.04em',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    minHeight: 38,
                  }}
                >
                  {t === 'full' ? 'full-stack' : 'monorepo'}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
            {/* FILE TREE */}
            <div style={{ flex: 1, minWidth: 'min(100%, 320px)', ...panelStyle }}>
              <div style={panelHeader}>FILE TREE</div>
              {full ? (
                <pre style={treePre}>
{'app/\n'}
{'├─ (marketing)/          '}<span style={{ color: '#52525B' }}>landing · pricing</span>{'\n'}
{'├─ (app)/\n'}
{'│  ├─ dashboard/\n'}
{'│  ├─ settings/\n'}
{'│  └─ billing/\n'}
{'└─ api/\n'}
{'   ├─ auth/[...all]/     '}<span style={{ color: '#52525B' }}>Better Auth</span>{'\n'}
{'   └─ webhooks/polar/    '}<span style={{ color: '#52525B' }}>payments</span>{'\n'}
{'lib/\n'}
{'├─ auth.ts\n'}
{'├─ polar.ts\n'}
{'└─ db/\n'}
{'   ├─ schema.ts          '}<span style={{ color: '#52525B' }}>Drizzle</span>{'\n'}
{'   └─ index.ts           '}<span style={{ color: '#52525B' }}>Neon client</span>
                </pre>
              ) : (
                <pre style={treePre}>
{'apps/\n'}
{'├─ web/                  '}<span style={{ color: '#52525B' }}>Next.js 16</span>{'\n'}
{'├─ mobile/               '}<span style={{ color: '#52525B' }}>React Native</span>{'\n'}
{'└─ api/                  '}<span style={{ color: '#52525B' }}>routes + webhooks</span>{'\n'}
{'packages/\n'}
{'├─ ui/                   '}<span style={{ color: '#52525B' }}>shadcn/ui components</span>{'\n'}
{'├─ db/                   '}<span style={{ color: '#52525B' }}>Drizzle schema + client</span>{'\n'}
{'├─ auth/                 '}<span style={{ color: '#52525B' }}>Better Auth config</span>{'\n'}
{'└─ config/               '}<span style={{ color: '#52525B' }}>tsconfig · eslint · tailwind</span>{'\n'}
{'turbo.json\n'}
{'package.json'}
                </pre>
              )}
            </div>

            {/* CODE */}
            <div style={{ flex: 1.4, minWidth: 'min(100%, 360px)', display: 'flex', flexDirection: 'column', ...panelStyle }}>
              {full ? (
                <>
                  <div style={panelHeader}>app/api/billing/route.ts</div>
                  <div style={codeBody}>
                    {codeLine(1, <><span style={{ color: W }}>import</span> {'{ auth }'} <span style={{ color: W }}>from</span> <span style={{ color: S }}>"@/lib/auth"</span>;</>)}
                    {codeLine(2, <><span style={{ color: W }}>import</span> {'{ polar }'} <span style={{ color: W }}>from</span> <span style={{ color: S }}>"@/lib/polar"</span>;</>)}
                    {codeLine(3, <> </>)}
                    {codeLine(4, <><span style={{ color: W }}>export async function</span> POST(req: Request) {'{'}</>)}
                    {codeLine(5, <>{'  '}<span style={{ color: W }}>const</span> session = <span style={{ color: W }}>await</span> auth.api.getSession({'{ headers: req.headers }'});</>)}
                    {codeLine(6, <>{'  '}<span style={{ color: W }}>if</span> (!session) {'{'}</>)}
                    {codeLine(7, <>{'    '}<span style={{ color: W }}>return</span> Response.json({'{ error: '}<span style={{ color: S }}>"Unauthorized"</span>{' }'}, {'{ status: '}<span style={{ color: S }}>401</span>{' }'});</>)}
                    {codeLine(8, <>{'  }'}</>)}
                    {codeLine(9, <>{'  '}<span style={{ color: W }}>const</span> checkout = <span style={{ color: W }}>await</span> polar.checkouts.create({'{'}</>)}
                    {codeLine(10, <>{'    '}customerExternalId: session.user.id,</>)}
                    {codeLine(11, <>{'    '}products: [env.POLAR_PRO_PRODUCT_ID],</>)}
                    {codeLine(12, <>{'  });'}</>)}
                    {codeLine(13, <>{'  '}<span style={{ color: W }}>return</span> Response.json({'{ url: checkout.url }'});</>)}
                    {codeLine(14, <>{'}'}</>)}
                  </div>
                </>
              ) : (
                <>
                  <div style={panelHeader}>packages/db/src/schema.ts</div>
                  <div style={codeBody}>
                    {codeLine(1, <><span style={{ color: W }}>import</span> {'{ pgTable, text, timestamp }'} <span style={{ color: W }}>from</span> <span style={{ color: S }}>"drizzle-orm/pg-core"</span>;</>)}
                    {codeLine(2, <> </>)}
                    {codeLine(3, <><span style={{ color: W }}>export const</span> subscriptions = pgTable(<span style={{ color: S }}>"subscriptions"</span>, {'{'}</>)}
                    {codeLine(4, <>{'  '}id: text(<span style={{ color: S }}>"id"</span>).primaryKey(),</>)}
                    {codeLine(5, <>{'  '}userId: text(<span style={{ color: S }}>"user_id"</span>).references(() =&gt; users.id),</>)}
                    {codeLine(6, <>{'  '}status: text(<span style={{ color: S }}>"status"</span>).$type&lt;<span style={{ color: S }}>"active" | "canceled"</span>&gt;(),</>)}
                    {codeLine(7, <>{'  '}renewsAt: timestamp(<span style={{ color: S }}>"renews_at"</span>),</>)}
                    {codeLine(8, <>{'});'}</>)}
                    {codeLine(9, <> </>)}
                    {codeLine(10, <><span style={{ color: '#52525B' }}>// one schema, imported by apps/web, apps/mobile and apps/api</span></>)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

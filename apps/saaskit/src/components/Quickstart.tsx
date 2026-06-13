import { MONO } from '../lib/constants'
import { container, eyebrow, h2Style } from '../lib/styles'

export function Quickstart() {
  const steps = [
    {
      n: 1,
      title: 'Initialize',
      body: <>Scaffold the template locally — full-stack or monorepo, your pick.</>,
      cmd: 'npx create-saaskit-app@latest',
    },
    {
      n: 2,
      title: 'Configure',
      body: (
        <>
          Add your keys to <span style={{ fontFamily: MONO, fontSize: 13.5, color: '#D4D4D8' }}>.env</span>. Auth, payments, and the database connect automatically.
        </>
      ),
      cmd: 'cp .env.example .env.local',
    },
    {
      n: 3,
      title: 'Deploy',
      body: <>Push to Vercel and you're live. Env validation catches anything missing.</>,
      cmd: 'saaskit deploy',
    },
  ]
  return (
    <section
      style={{
        background: '#0A0A0A',
        color: '#FAFAFA',
        borderTop: '1px solid #18181B',
        padding: 'clamp(80px, 10vw, 128px) 0',
      }}
    >
      <div style={container({ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 6vw, 96px)' })}>
        <div data-reveal style={{ flex: 1, minWidth: 'min(100%, 340px)' }}>
          <div style={{ ...eyebrow('#71717A'), marginBottom: 18 }}>QUICKSTART</div>
          <h2 style={h2Style}>Live in three commands.</h2>
          <p style={{ margin: 0, maxWidth: 420, color: '#A1A1AA', fontSize: 17, lineHeight: 1.6, textWrap: 'pretty' }}>
            No setup wizard, no twelve-page config doc. Scaffold, add your keys, push.
          </p>
        </div>
        <div data-reveal style={{ flex: 1.2, minWidth: 'min(100%, 380px)', display: 'flex', flexDirection: 'column' }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                <span style={{ width: 36, height: 36, border: '1px solid #3F3F46', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, color: '#FAFAFA', flex: 'none' }}>
                  {s.n}
                </span>
                {i < steps.length - 1 && <span style={{ width: 1, flex: 1, background: '#27272A' }} />}
              </div>
              <div style={{ paddingBottom: i < steps.length - 1 ? 36 : 0, minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', margin: '6px 0 8px' }}>{s.title}</div>
                <p style={{ margin: '0 0 14px', color: '#A1A1AA', fontSize: 15, lineHeight: 1.6 }}>{s.body}</p>
                <div style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto', background: '#111113', border: '1px solid #27272A', borderRadius: 6, padding: '10px 16px', fontFamily: MONO, fontSize: 13, whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#52525B' }}>$</span> <span style={{ color: '#FAFAFA' }}>{s.cmd}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

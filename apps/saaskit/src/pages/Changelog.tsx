import { MONO } from '../lib/constants'
import { PageLayout } from '../components/PageLayout'
import { PageHeader } from '../components/content'

type Tag = 'Added' | 'Improved' | 'Fixed' | 'Changed'
type Release = { version: string; date: string; summary?: string; entries: { tag: Tag; text: string }[] }

const TAG_COLOR: Record<Tag, string> = {
  Added: '#16A34A',
  Improved: '#0A0A0A',
  Fixed: '#71717A',
  Changed: '#52525B',
}

const RELEASES: Release[] = [
  {
    version: '1.4.0',
    date: 'Jun 2026',
    summary: 'Polar billing portal and a leaner onboarding.',
    entries: [
      { tag: 'Added', text: 'Customer portal route wired to Polar — manage billing and connect the GitHub benefit in one click.' },
      { tag: 'Added', text: 'One-command env validation: `saaskit doctor` reports any missing keys before you deploy.' },
      { tag: 'Improved', text: 'Faster cold starts on the dashboard with React Query prefetching on the server.' },
      { tag: 'Fixed', text: 'Webhook replay no longer double-applies subscription upgrades.' },
    ],
  },
  {
    version: '1.3.0',
    date: 'May 2026',
    summary: 'Next.js 16 and the monorepo template.',
    entries: [
      { tag: 'Added', text: 'Monorepo (Turborepo) template: shared ui, db and config packages across web, mobile and api.' },
      { tag: 'Changed', text: 'Upgraded to Next.js 16 and React 19 across both templates.' },
      { tag: 'Improved', text: 'Drizzle schema split into per-feature files for cleaner diffs.' },
    ],
  },
  {
    version: '1.2.0',
    date: 'Apr 2026',
    entries: [
      { tag: 'Added', text: 'Transactional email templates (verify, reset, receipt) with a typed send helper.' },
      { tag: 'Improved', text: 'Better Auth session cookies now share across subdomains out of the box.' },
      { tag: 'Fixed', text: 'OAuth account linking edge case when an email already existed.' },
    ],
  },
  {
    version: '1.1.0',
    date: 'Mar 2026',
    entries: [
      { tag: 'Added', text: 'shadcn/ui dashboard shell with a real, themeable layout.' },
      { tag: 'Fixed', text: 'Type inference on the tRPC client when the router grew past 12 procedures.' },
    ],
  },
  {
    version: '1.0.0',
    date: 'Feb 2026',
    summary: 'First public release.',
    entries: [{ tag: 'Added', text: 'Full-stack template: auth, payments, billing, database and deploy — wired and tested.' }],
  },
]

export default function Changelog() {
  return (
    <PageLayout maxWidth={860}>
      <PageHeader
        eyebrow="CHANGELOG"
        title="What's new."
        lede="Every release is shipped to the private repo. Buy once and pull the changes — here's what landed."
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {RELEASES.map((r, i) => (
          <div key={r.version} style={{ display: 'flex', gap: 'clamp(20px, 4vw, 48px)', flexWrap: 'wrap' }}>
            {/* version rail */}
            <div style={{ flex: 'none', width: 'min(100%, 150px)' }}>
              <div
                style={{
                  position: 'sticky',
                  top: 96,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
                  v{r.version}
                </span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: '#A1A1AA', marginTop: 4 }}>{r.date}</div>
            </div>

            {/* entries */}
            <div
              style={{
                flex: 1,
                minWidth: 'min(100%, 300px)',
                borderLeft: '1px solid #E4E4E7',
                paddingLeft: 'clamp(20px, 3vw, 32px)',
                paddingBottom: i < RELEASES.length - 1 ? 'clamp(36px, 5vw, 56px)' : 0,
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: -4.5,
                  top: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#0A0A0A',
                }}
              />
              {r.summary && (
                <p style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
                  {r.summary}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {r.entries.map((e, j) => (
                  <div key={j} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span
                      style={{
                        flex: 'none',
                        fontFamily: MONO,
                        fontSize: 10.5,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: TAG_COLOR[e.tag],
                        border: `1px solid ${e.tag === 'Added' ? 'rgba(22,163,74,0.4)' : '#E4E4E7'}`,
                        borderRadius: 4,
                        padding: '3px 8px',
                        width: 72,
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      {e.tag}
                    </span>
                    <span style={{ color: '#52525B', fontSize: 15.5, lineHeight: 1.6 }}>{e.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

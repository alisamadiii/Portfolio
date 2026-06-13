import type { CSSProperties } from 'react'
import { MONO, noop } from '../lib/constants'
import { container } from '../lib/styles'

export function Footer() {
  const footLink: CSSProperties = {
    color: '#A1A1AA',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'color 0.2s',
  }
  const colTitle: CSSProperties = {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: '0.14em',
    color: '#52525B',
    marginBottom: 18,
  }
  const cols: { title: string; links: [string, string][] }[] = [
    {
      title: 'PRODUCT',
      links: [
        ['#features', 'Features'],
        ['#templates', 'Templates'],
        ['#pricing', 'Pricing'],
        ['#', 'Live demo'],
      ],
    },
    {
      title: 'RESOURCES',
      links: [
        ['#docs', 'Docs'],
        ['#', 'Changelog'],
        ['#', 'GitHub'],
      ],
    },
    {
      title: 'LEGAL',
      links: [
        ['#', 'License'],
        ['#', 'Terms'],
      ],
    },
  ]
  return (
    <footer style={{ background: '#0A0A0A', color: '#FAFAFA', borderTop: '1px solid #27272A', padding: '64px 0 40px' }}>
      <div style={container()}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(40px, 6vw, 96px)', marginBottom: 56 }}>
          <div style={{ flex: 1.4, minWidth: 'min(100%, 260px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 12, height: 12, background: '#FAFAFA', display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600 }}>saaskit</span>
            </div>
            <p style={{ margin: 0, color: '#71717A', fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>
              Production-ready SaaS starter templates. Skip the boilerplate, ship the idea.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.title} style={{ flex: 1, minWidth: 140 }}>
              <div style={colTitle}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {col.links.map(([href, label]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={href === '#' ? noop : undefined}
                    className="foot-lnk"
                    style={footLink}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #18181B', paddingTop: 28, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#52525B', whiteSpace: 'nowrap' }}>© 2026 SaaSKit</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" onClick={noop} className="foot-lnk" style={{ fontFamily: MONO, fontSize: 12, color: '#71717A', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>X ↗</a>
            <a href="#" onClick={noop} className="foot-lnk" style={{ fontFamily: MONO, fontSize: 12, color: '#71717A', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>GitHub ↗</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

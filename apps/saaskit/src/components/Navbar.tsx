import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { MONO } from '../lib/constants'
import { useScrolled, useViewport } from '../lib/hooks'

const NAV_LINKS: { href: string; label: string; route?: boolean }[] = [
  { href: '/#features', label: 'Features' },
  { href: '/#templates', label: 'Templates' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs', route: true },
  { href: '/#faq', label: 'FAQ' },
]

/**
 * Self-contained top nav, used on the landing page and every content page.
 * `solid` forces the opaque state (content pages sit on a white background).
 */
export function Navbar({ solid = false }: { solid?: boolean }) {
  const { isMobile } = useViewport()
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const active = solid || scrolled || menuOpen

  const navLink: CSSProperties = {
    color: '#A1A1AA',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'color 0.2s',
  }

  const renderLink = (l: (typeof NAV_LINKS)[number], style: CSSProperties, onClick?: () => void) =>
    l.route ? (
      <Link key={l.href} to={l.href} className="lnk" style={style} onClick={onClick}>
        {l.label}
      </Link>
    ) : (
      <a key={l.href} href={l.href} className="lnk" style={style} onClick={onClick}>
        {l.label}
      </a>
    )

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: active ? 'rgba(10,10,10,0.88)' : 'rgba(10,10,10,0)',
          borderBottom: `1px solid ${active ? '#27272A' : 'transparent'}`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 clamp(20px, 4vw, 32px)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#FAFAFA' }}
          >
            <span style={{ width: 14, height: 14, background: '#FAFAFA', flex: 'none', display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>saaskit</span>
          </Link>

          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {NAV_LINKS.map((l) => renderLink(l, navLink))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="star-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#A1A1AA',
                    textDecoration: 'none',
                    fontFamily: MONO,
                    fontSize: 13,
                    padding: '9px 14px',
                    border: '1px solid #27272A',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  ★ 4.2k
                </a>
                <a
                  href="/#pricing"
                  className="btn-white"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#FAFAFA',
                    color: '#0A0A0A',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '9px 18px',
                    borderRadius: 6,
                    transition: 'background 0.2s, transform 0.2s',
                  }}
                >
                  Get the template
                </a>
              </div>
            </>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'none',
                border: '1px solid #27272A',
                borderRadius: 6,
                color: '#FAFAFA',
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: '0.12em',
                padding: '12px 16px',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              {menuOpen ? 'CLOSE' : 'MENU'}
            </button>
          )}
        </div>
      </nav>

      {isMobile && menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            zIndex: 49,
            background: 'rgba(10,10,10,0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid #27272A',
            padding: '12px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {NAV_LINKS.map((l, i) =>
            renderLink(
              l,
              {
                color: '#FAFAFA',
                textDecoration: 'none',
                fontSize: 16,
                padding: '13px 4px',
                borderBottom: i < NAV_LINKS.length - 1 ? '1px solid #18181B' : 'none',
              },
              () => setMenuOpen(false),
            ),
          )}
          <a
            href="/#pricing"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FAFAFA',
              color: '#0A0A0A',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              padding: '13px 18px',
              borderRadius: 6,
              minHeight: 44,
            }}
          >
            Get the template
          </a>
        </div>
      )}
    </>
  )
}

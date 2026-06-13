import type { CSSProperties } from 'react'
import { MONO, noop } from '../lib/constants'

export function Navbar({
  isMobile,
  scrolled,
  menuOpen,
  setMenuOpen,
}: {
  isMobile: boolean
  scrolled: boolean
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
}) {
  const active = scrolled || menuOpen
  const navLink: CSSProperties = {
    color: '#A1A1AA',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'color 0.2s',
  }
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
          <a
            href="#top"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: '#FAFAFA',
            }}
          >
            <span
              style={{ width: 14, height: 14, background: '#FAFAFA', flex: 'none', display: 'inline-block' }}
            />
            <span
              style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}
            >
              saaskit
            </span>
          </a>

          {!isMobile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <a href="#features" className="lnk" style={navLink}>Features</a>
                <a href="#templates" className="lnk" style={navLink}>Templates</a>
                <a href="#pricing" className="lnk" style={navLink}>Pricing</a>
                <a href="#docs" className="lnk" style={navLink}>Docs</a>
                <a href="#faq" className="lnk" style={navLink}>FAQ</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a
                  href="#"
                  onClick={noop}
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
                  href="#pricing"
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
          {[
            ['#features', 'Features'],
            ['#templates', 'Templates'],
            ['#pricing', 'Pricing'],
            ['#docs', 'Docs'],
            ['#faq', 'FAQ'],
          ].map(([href, label], i, arr) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                color: '#FAFAFA',
                textDecoration: 'none',
                fontSize: 16,
                padding: '13px 4px',
                borderBottom: i < arr.length - 1 ? '1px solid #18181B' : 'none',
              }}
            >
              {label}
            </a>
          ))}
          <a
            href="#pricing"
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

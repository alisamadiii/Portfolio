import { useEffect, useRef, useState } from 'react'
import { CMD, HERO_VIDEO, MONO, TRUST, noop } from '../lib/constants'
import { eyebrow } from '../lib/styles'
import { useCopy } from '../lib/hooks'
import { CommandChip } from './CommandChip'

export function Hero() {
  const [copiedHero, copyHero] = useCopy()
  const cmdRef = useRef<HTMLSpanElement>(null)
  const [termDone, setTermDone] = useState(false)

  useEffect(() => {
    let i = 0
    let typer: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      typer = setInterval(() => {
        const el = cmdRef.current
        if (!el) return
        i += 1
        el.textContent = CMD.slice(0, i)
        if (i >= CMD.length) {
          clearInterval(typer)
          setTimeout(() => setTermDone(true), 450)
        }
      }, 42)
    }, 550)
    return () => {
      clearTimeout(start)
      clearInterval(typer)
    }
  }, [])

  return (
    <header id="top" style={{ position: 'relative', padding: 'clamp(120px, 16vh, 168px) 0 0' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <video
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center bottom',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(10,10,10,0.82) 0%, rgba(10,10,10,0.42) 48%, rgba(10,10,10,0.55) 78%, rgba(10,10,10,0.95) 100%)',
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 clamp(20px, 4vw, 32px)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'clamp(40px, 5vw, 72px)',
          paddingBottom: 'clamp(72px, 9vw, 110px)',
        }}
      >
        <div data-reveal style={{ flex: 1.1, minWidth: 'min(100%, 420px)' }}>
          <div style={{ ...eyebrow('#71717A'), letterSpacing: '0.16em', marginBottom: 24 }}>
            SAAS STARTER TEMPLATE
          </div>
          <h1
            style={{
              margin: '0 0 24px',
              fontSize: 'clamp(42px, 5.4vw, 72px)',
              fontWeight: 600,
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              textWrap: 'balance',
            }}
          >
            Ship your SaaS this weekend
            <span style={{ color: '#52525B' }}> — not next quarter.</span>
          </h1>
          <p
            style={{
              margin: '0 0 36px',
              maxWidth: 540,
              color: '#A1A1AA',
              fontSize: 'clamp(16px, 1.4vw, 18px)',
              lineHeight: 1.6,
              textWrap: 'pretty',
            }}
          >
            Production-ready full-stack and monorepo templates with auth, payments, billing, and a
            database already wired together. Clone it, configure it, deploy.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            <a
              href="#pricing"
              className="btn-white"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#FAFAFA',
                color: '#0A0A0A',
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 500,
                padding: '13px 24px',
                borderRadius: 6,
                minHeight: 44,
                transition: 'background 0.2s, transform 0.2s',
              }}
            >
              Get the template
            </a>
            <a
              href="#"
              onClick={noop}
              className="btn-ghost-dark"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: '#FAFAFA',
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 500,
                padding: '13px 24px',
                border: '1px solid #27272A',
                borderRadius: 6,
                minHeight: 44,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              View live demo <span style={{ color: '#71717A' }}>↗</span>
            </a>
          </div>
          <CommandChip onCopy={copyHero} copied={copiedHero} />
        </div>

        <div data-reveal style={{ flex: 1, minWidth: 'min(100%, 380px)', transitionDelay: '0.12s' }}>
          <div
            style={{
              background: '#111113',
              border: '1px solid #27272A',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 16px',
                borderBottom: '1px solid #27272A',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: '#27272A', display: 'inline-block' }}
                />
              ))}
              <span style={{ marginLeft: 10, fontFamily: MONO, fontSize: 12, color: '#71717A' }}>
                ~/dev — zsh
              </span>
            </div>
            <div
              style={{
                padding: '22px 22px 26px',
                fontFamily: MONO,
                fontSize: 13.5,
                lineHeight: 2,
                color: '#A1A1AA',
                minHeight: 252,
                overflowX: 'auto',
              }}
            >
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: '#52525B' }}>$</span>{' '}
                <span ref={cmdRef} style={{ color: '#FAFAFA' }} />
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 15,
                    background: '#FAFAFA',
                    verticalAlign: -2,
                    marginLeft: 1,
                    animation: 'blink 1.1s step-end infinite',
                  }}
                />
              </div>
              {termDone && (
                <div data-reveal data-on="1" style={{ whiteSpace: 'nowrap' }}>
                  <div>
                    <span style={{ color: '#4ADE80' }}>✓</span> Cloning template
                    <span style={{ color: '#52525B' }}> ··················· </span>done
                  </div>
                  <div>
                    <span style={{ color: '#4ADE80' }}>✓</span> Installing dependencies
                    <span style={{ color: '#52525B' }}> ··········· </span>done
                  </div>
                  <div>
                    <span style={{ color: '#4ADE80' }}>✓</span> Generating Drizzle schema
                    <span style={{ color: '#52525B' }}> ········· </span>done
                  </div>
                  <div>
                    <span style={{ color: '#4ADE80' }}>✓</span> Wiring Better Auth + Polar
                    <span style={{ color: '#52525B' }}> ········ </span>done
                  </div>
                  <div style={{ height: 14 }} />
                  <div>
                    <span style={{ color: '#52525B' }}>➜</span>{' '}
                    <span style={{ color: '#FAFAFA' }}>cd saaskit &amp;&amp; npm run dev</span>
                  </div>
                  <div style={{ color: '#71717A' }}>
                    {'  '}Ready on http://localhost:3000{' '}
                    <span style={{ color: '#52525B' }}>— 1.2s</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TRUST STRIP */}
      <div style={{ position: 'relative', borderTop: '1px solid #18181B' }}>
        <div
          data-reveal
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '44px clamp(20px, 4vw, 32px) 64px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: '0.14em',
              color: '#52525B',
              marginBottom: 26,
            }}
          >
            BUILT ON THE STACK YOU ALREADY TRUST
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'baseline',
              columnGap: 'clamp(24px, 3.5vw, 44px)',
              rowGap: 16,
            }}
          >
            {TRUST.map((name) => (
              <span
                key={name}
                className="logo-item"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#71717A',
                  transition: 'color 0.2s',
                  cursor: 'default',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

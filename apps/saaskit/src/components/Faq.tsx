import { useState } from 'react'
import { FAQS, MONO } from '../lib/constants'
import { eyebrow, h2Style } from '../lib/styles'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section
      id="faq"
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
        borderTop: '1px solid #E4E4E7',
        padding: 'clamp(80px, 10vw, 128px) 0',
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 clamp(20px, 4vw, 32px)' }}>
        <div data-reveal style={{ marginBottom: 'clamp(36px, 4vw, 56px)' }}>
          <div style={{ ...eyebrow('#71717A'), marginBottom: 18 }}>FAQ</div>
          <h2 style={{ ...h2Style, marginBottom: 0 }}>Questions, answered.</h2>
        </div>
        <div data-reveal style={{ borderTop: '1px solid #E4E4E7' }}>
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} style={{ borderBottom: '1px solid #E4E4E7' }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 20,
                    background: 'none',
                    border: 'none',
                    padding: '22px 4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', color: '#0A0A0A', fontFamily: "'Geist', sans-serif" }}>
                    {item.q}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 18, color: '#A1A1AA', flex: 'none', width: 20, textAlign: 'center' }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ margin: 0, padding: '0 40px 24px 4px', color: '#71717A', fontSize: 15.5, lineHeight: 1.65, textWrap: 'pretty' }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

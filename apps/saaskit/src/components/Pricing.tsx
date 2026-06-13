import { useQuery } from '@tanstack/react-query'
import { MONO, noop } from '../lib/constants'
import { container, eyebrow, h2Style } from '../lib/styles'
import { fetchSaaskitPlans, productsQueryKey } from '../lib/products'

type Tier = {
  label: string
  price: string
  priceSuffix: string
  highlight: boolean
  features: string[]
  cta: string
}

// Shown while the DB request is in flight or if no SAASKIT products are
// returned — keeps the section populated and matches the original design.
const FALLBACK_TIERS: Tier[] = [
  {
    label: 'FULL-STACK',
    price: '$149',
    priceSuffix: 'one-time',
    highlight: false,
    features: [
      'The Full-Stack template, full source',
      'Auth, payments, billing & db wired',
      'Lifetime updates',
      'Unlimited personal & client projects',
    ],
    cta: 'Get Full-Stack',
  },
  {
    label: 'MONOREPO',
    price: '$249',
    priceSuffix: 'one-time',
    highlight: true,
    features: [
      'The Turborepo workspace, full source',
      'Web + mobile + API apps',
      'Shared UI, db & config packages',
      'Lifetime updates',
    ],
    cta: 'Get Monorepo',
  },
  {
    label: 'BUNDLE / TEAM',
    price: '$399',
    priceSuffix: 'one-time',
    highlight: false,
    features: [
      'Both templates, full source',
      'Team license — up to 10 developers',
      'Priority updates & support',
      'Private Discord channel',
    ],
    cta: 'Get the Bundle',
  },
]

// Feature bullets fall back to these (keyed by product name) when a product
// row has no `metadata.features` array in the database.
const DEFAULT_FEATURES: Record<string, string[]> = Object.fromEntries(
  FALLBACK_TIERS.map((t) => [t.label, t.features]),
)

function formatPrice(cents: number): string {
  const dollars = cents / 100
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`
}

export function Pricing() {
  const { data } = useQuery({
    queryKey: productsQueryKey,
    queryFn: ({ signal }) => fetchSaaskitPlans(signal),
  })

  const tiers: Tier[] =
    data && data.length > 0
      ? data.map((p) => {
          const label = p.name.toUpperCase()
          const features =
            p.metadata?.features && p.metadata.features.length > 0
              ? p.metadata.features
              : (DEFAULT_FEATURES[label] ?? [])
          return {
            label,
            price: formatPrice(p.priceAmount),
            priceSuffix: p.isRecurring
              ? `/${p.recurringInterval ?? 'mo'}`
              : 'one-time',
            highlight: p.popular,
            features,
            cta: `Get ${p.name}`,
          }
        })
      : FALLBACK_TIERS

  return (
    <section
      id="pricing"
      style={{
        background: '#FFFFFF',
        color: '#0A0A0A',
        borderTop: '1px solid #E4E4E7',
        padding: 'clamp(80px, 10vw, 128px) 0',
      }}
    >
      <div style={container()}>
        <div data-reveal style={{ maxWidth: 640, margin: '0 auto clamp(40px, 5vw, 64px)', textAlign: 'center' }}>
          <div style={{ ...eyebrow('#71717A'), marginBottom: 18 }}>PRICING</div>
          <h2 style={h2Style}>Buy once. Build forever.</h2>
          <p style={{ margin: 0, color: '#71717A', fontSize: 17, lineHeight: 1.6 }}>
            One-time purchase. Lifetime updates. No subscription.
          </p>
        </div>

        <div
          data-reveal
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          {tiers.map((t) => {
            const hl = t.highlight
            return (
              <div
                key={t.label}
                className={hl ? 'price-card-hl' : 'price-card'}
                style={{
                  position: 'relative',
                  background: hl ? '#0A0A0A' : 'transparent',
                  color: hl ? '#FAFAFA' : '#0A0A0A',
                  border: `1px solid ${hl ? '#0A0A0A' : '#E4E4E7'}`,
                  borderRadius: 8,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                  transition: hl
                    ? 'transform 0.25s, box-shadow 0.25s'
                    : 'border-color 0.2s, transform 0.25s',
                }}
              >
                {hl && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -11,
                      left: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      background: '#0A0A0A',
                      border: '1px solid #3F3F46',
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontFamily: MONO,
                      fontSize: 10.5,
                      letterSpacing: '0.14em',
                      color: '#FAFAFA',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                    MOST POPULAR
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', color: hl ? '#A1A1AA' : '#71717A', marginBottom: 14 }}>{t.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em' }}>{t.price}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: hl ? '#71717A' : '#A1A1AA' }}>{t.priceSuffix}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
                  {t.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 12, alignItems: 'baseline', color: hl ? '#A1A1AA' : '#52525B', fontSize: 14.5, lineHeight: 1.5 }}>
                      <span style={{ color: hl ? '#71717A' : '#A1A1AA', fontFamily: MONO, fontSize: 13 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a
                  href="#"
                  onClick={noop}
                  className={hl ? 'btn-solid-light' : 'btn-outline-invert'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: hl ? '#FAFAFA' : 'transparent',
                    color: '#0A0A0A',
                    border: hl ? 'none' : '1px solid #0A0A0A',
                    textDecoration: 'none',
                    fontSize: 14.5,
                    fontWeight: 500,
                    padding: '12px 20px',
                    borderRadius: 6,
                    minHeight: 44,
                    transition: hl ? 'background 0.2s' : 'background 0.2s, color 0.2s',
                  }}
                >
                  {t.cta}
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

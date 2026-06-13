import { useViewport, useReveals } from '../lib/hooks'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { Templates } from '../components/Templates'
import { Architecture } from '../components/Architecture'
import { Quickstart } from '../components/Quickstart'
import { DeepDive } from '../components/DeepDive'
import { Pricing } from '../components/Pricing'
import { Faq } from '../components/Faq'
import { FinalCta } from '../components/FinalCta'
import { Footer } from '../components/Footer'
import { CheckoutResult } from '../components/CheckoutResult'

export default function Landing() {
  const { isMobile, isMid } = useViewport()
  useReveals()

  const cols = isMobile
    ? '1fr'
    : isMid
      ? 'repeat(2, minmax(0, 1fr))'
      : 'repeat(4, minmax(0, 1fr))'
  const span2 = isMobile ? 'auto' : 'span 2'

  return (
    <div
      style={{
        background: '#0A0A0A',
        color: '#FAFAFA',
        fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'clip',
      }}
    >
      <Navbar />
      <Hero />
      <Features span2={span2} cols={cols} />
      <Templates />
      <Architecture />
      <Quickstart />
      <DeepDive />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
      <CheckoutResult />
    </div>
  )
}

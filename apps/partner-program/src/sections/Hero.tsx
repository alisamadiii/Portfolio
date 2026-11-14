import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { money, payoutFor } from '../lib/money';
import { program } from '../config';

const HERO_EXAMPLE = 1000;

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="hero__badge" data-reveal="1">
            <Logo size={22} />
            {program.company} Partner Program
          </p>
          <h1 className="h1" data-reveal="2">
            Earn <span className="underline-coral">40%</span> when a business you refer pays for its website.
          </h1>
          <p className="hero__sub" data-reveal="3">
            When they pay, you get 40% of their first website payment. If they don't pay, there's no payout.
            Simple and honest.
          </p>
          <div className="hero__ctas" data-reveal="4">
            <Link className="btn" to="/apply">
              Apply to become a partner <span className="arr" aria-hidden="true">→</span>
            </Link>
            <a className="link-strong" href="#how">See how it works</a>
          </div>
          <p className="hero__note" data-reveal="4">One-time payout per paying client. No fees to join.</p>
        </div>

        <div className="hero__visual" data-reveal="3">
          <div className="hero__backplate" aria-hidden="true" />
          <div className="payout-card">
            <div className="payout-card__row" style={{ alignItems: 'center' }}>
              <p className="muted" style={{ fontSize: 14, fontWeight: 600 }}>How a payout works</p>
              <span className="tag">Example</span>
            </div>
            <div className="payout-card__row" style={{ marginTop: 24 }}>
              <p className="body-2" style={{ fontSize: 16 }}>Business pays for its website</p>
              <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{money(HERO_EXAMPLE)}</p>
            </div>
            <div className="track" style={{ marginTop: 14 }} aria-hidden="true">
              <div className="track__fill track__fill--hero" />
            </div>
            <div className="payout-card__row muted" style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
              <span>40% to you</span>
              <span>60% stays with us</span>
            </div>
            <div className="you-get">
              <p style={{ color: 'var(--on-ink-2)' }}>You get</p>
              <p className="big-num">{money(payoutFor(HERO_EXAMPLE))}</p>
            </div>
            <div className="payout-card__row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #D9D2CA' }}>
              <p className="muted" style={{ fontSize: 15 }}>Their monthly subscription</p>
              <p style={{ fontSize: 15, fontWeight: 600 }}>$0 to you</p>
            </div>
            <p className="pill-success">
              <span aria-hidden="true">✓</span>Sent only after they pay
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Eyebrow } from '../components/Eyebrow';
import { program } from '../config';
import { money, payoutFor } from '../lib/money';
import { useCountUp } from '../lib/motion';

const SCALE_MAX = 3000;
const EXAMPLES = [
  { price: program.mainPlanPrice, label: 'Main website plan' },
  { price: 1000, label: 'Example custom price' },
  { price: program.largerPlanPrice, label: 'Larger plan' },
];

export function Earnings() {
  const [amount, setAmount] = useState(1000);
  const [amountText, setAmountText] = useState('1000');
  const earn = payoutFor(amount);
  const shown = useCountUp(earn);

  const set = (n: number, text?: string) => {
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1_000_000, n)) : 0;
    setAmount(a);
    setAmountText(text ?? String(a));
  };

  const pct = (n: number) => `${(Math.min(n / SCALE_MAX, 1) * 100).toFixed(2)}%`;

  return (
    <section id="earnings" aria-labelledby="earn-h" className="section">
      <div className="container">
        <Eyebrow reveal="1">Earnings</Eyebrow>
        <h2 id="earn-h" className="h2" data-reveal="2">Your payout follows the price.</h2>
        <p className="lead" data-reveal="3">
          Every business is different, so website prices are too. Whatever the business pays for its website, you
          get 40% of that first payment.
        </p>

        <div className="earn">
          <div className="earn__examples" data-reveal="2">
            <p className="muted" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Tap an example</p>
            {EXAMPLES.map((ex) => {
              const on = amount === ex.price;
              return (
                <button key={ex.price} type="button" className={`ex${on ? ' ex--on' : ''}`} aria-pressed={on} onClick={() => set(ex.price)}>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="ex__label">{ex.label}</span>
                    <span className="ex__price">Business pays {money(ex.price)}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="ex__label">You get</span>
                    <span className="ex__earn">{money(payoutFor(ex.price))}</span>
                  </span>
                </button>
              );
            })}
            <div className="ex-zero">
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="muted" style={{ fontSize: 14 }}>Monthly subscription</span>
                <span style={{ fontSize: 17, fontWeight: 600 }}>Client Hub, {money(program.hubMonthly)} a month</span>
              </span>
              <span className="muted" style={{ fontSize: 24, fontWeight: 700 }}>$0</span>
            </div>
          </div>

          <div className="calc" data-reveal="3">
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Try any price</p>
              <p className="muted" style={{ marginTop: 4, fontSize: 15 }}>Type what the business pays for its website, or drag the slider.</p>
            </div>
            <div className="calc__inputs">
              <div className="field-group" style={{ flex: '0 1 220px' }}>
                <label className="label" htmlFor="calc-price">Website price</label>
                <div className="money-input">
                  <span aria-hidden="true">$</span>
                  <input
                    className="field"
                    id="calc-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={amountText}
                    onChange={(e) => set(parseFloat(e.target.value), e.target.value)}
                  />
                </div>
              </div>
              <div className="field-group" style={{ flex: '1 1 220px', gap: 6 }}>
                <label htmlFor="calc-range">
                  <span className="sr-only">Website price slider</span>
                  <span aria-hidden="true" className="muted" style={{ fontSize: 13, fontWeight: 500 }}>$300 to $3,000</span>
                </label>
                <input
                  className="range"
                  id="calc-range"
                  type="range"
                  min={300}
                  max={SCALE_MAX}
                  step={1}
                  value={Math.max(300, Math.min(SCALE_MAX, amount))}
                  onChange={(e) => set(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="bar-row">
                <div className="bar-row__label"><span>Business pays</span><span>{money(amount)}</span></div>
                <div className="track" aria-hidden="true"><div className="track__fill bar" style={{ width: pct(amount), background: 'var(--ink)' }} /></div>
              </div>
              <div className="bar-row">
                <div className="bar-row__label"><span>You get (40%)</span><span>{money(earn)}</span></div>
                <div className="track" aria-hidden="true"><div className="track__fill bar" style={{ width: pct(earn), background: 'var(--coral)' }} /></div>
              </div>
            </div>
            <div className="calc__result">
              <p style={{ color: 'var(--on-ink-2)' }}>You'd earn, one time</p>
              <p className="calc__num" aria-hidden="true">{money(shown)}</p>
              <p className="sr-only" aria-live="polite">You'd earn {money(earn)}, one time.</p>
            </div>
          </div>
        </div>

        <div className="example-strip" data-reveal="2">
          <span className="badge-outline">Example, not a promise</span>
          <p style={{ flex: '1 1 320px', fontSize: 18, lineHeight: 1.45 }}>
            If 3 businesses you refer each pay {money(program.mainPlanPrice)} for a website, you'd earn{' '}
            <strong>{money(payoutFor(program.mainPlanPrice) * 3)}</strong> in total.
          </p>
        </div>
        <p className="body-2" data-reveal="3" style={{ marginTop: 20, fontSize: 16 }}>
          <strong style={{ color: 'var(--ink)' }}>One-time payout only.</strong> You don't earn from the client's monthly
          subscription. Figures are examples; your payout is 40% of what the business actually pays as its first website
          payment.
        </p>
      </div>
    </section>
  );
}

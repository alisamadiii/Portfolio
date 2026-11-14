import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const STEPS = [
  ['About you', 'Name, email and phone (optional)'],
  ['Your network', 'Who you know and why you want to join'],
  ['Partner agreement', 'Read and sign, then download it as a PDF'],
  ['Review and submit', 'Check everything and edit anything'],
];

export function ApplyCta() {
  return (
    <section id="apply" aria-labelledby="apply-h" className="section">
      <div className="container">
        <div className="cta" data-reveal="1">
          <div className="cta__copy">
            <Logo size={56} />
            <h2 id="apply-h" className="h2" style={{ marginTop: 24 }}>Ready to become a partner?</h2>
            <p style={{ marginTop: 16, maxWidth: 460, fontSize: 18, color: 'var(--on-ink-2)' }}>
              Apply in four short steps. We review every application by hand and email approved partners their referral code.
            </p>
            <Link className="btn" to="/apply" style={{ marginTop: 32 }}>
              Start your application <span className="arr" aria-hidden="true">→</span>
            </Link>
            <p style={{ marginTop: 16, fontSize: 15, color: 'var(--on-ink-3)' }}>No fees to join.</p>
          </div>
          <ol className="cta__steps">
            {STEPS.map(([title, desc], i) => (
              <li key={title} className="cta__step" data-reveal={String(Math.min(i + 2, 4))}>
                <span className={`cta__num${i === 0 ? ' cta__num--on' : ''}`}>{i + 1}</span>
                <span>
                  <strong style={{ fontWeight: 600 }}>{title}</strong>
                  <br />
                  <span style={{ fontSize: 15, color: 'var(--on-ink-3)' }}>{desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

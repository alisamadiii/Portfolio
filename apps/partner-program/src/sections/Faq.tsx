import type { ReactNode } from 'react';
import { Eyebrow } from '../components/Eyebrow';
import { Ph } from '../components/Placeholder';
import { contact, program } from '../config';
import { money, payoutFor } from '../lib/money';

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'When do I get paid?',
    a: <>After the client pays for their website. We send your payout within <Ph>{program.payoutDays}</Ph> via <Ph>{program.paymentMethodExamples}</Ph>.</>,
  },
  {
    q: 'How much will I earn?',
    a: <>40% of the business's first website payment. Prices vary by business and plan, so for example a {money(program.mainPlanPrice)} website pays you {money(payoutFor(program.mainPlanPrice))} and a $1,000 website pays you {money(payoutFor(1000))}.</>,
  },
  { q: 'What counts as a referral?', a: "A business that uses your code or names you when it signs up, wasn't already talking to us, and pays for a website." },
  { q: 'Do I earn from the monthly subscription?', a: 'No. You earn only from the first website payment.' },
  { q: 'Does it cost anything to join?', a: 'No. Joining is free.' },
  { q: 'What if the client asks for a refund?', a: <Ph>{program.refundPolicy}</Ph> },
  { q: 'Do I need to sell or do anything technical?', a: 'No. Just introduce us. We handle the conversation, design and build.' },
  { q: 'How long does approval take?', a: <>We review every application by hand, usually within <Ph>{program.approvalDays}</Ph> business days.</> },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="section section--white">
      <div className="container faq">
        <div className="faq__intro" data-reveal="1">
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-h" className="h2">Questions partners ask</h2>
          <p className="body-2" style={{ marginTop: 20 }}>
            Something else? Email <a href={`mailto:${contact.email}`}>{contact.email}</a>.
          </p>
        </div>
        <div className="faq__list" data-reveal="2">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="faq__item">
              <summary>
                <span className="faq__q">{q}</span>
                <span className="faq__icon" aria-hidden="true">+</span>
              </summary>
              <p className="faq__a">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

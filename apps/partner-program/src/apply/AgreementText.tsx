import { Ph } from '../components/Placeholder';
import { program } from '../config';
import { money, payoutFor } from '../lib/money';

/**
 * DRAFT partner agreement. Have a lawyer review it before going live.
 * The signed PDF is rendered from packages/ui/src/pdfs/partner-agreement.tsx:
 * change both together (placeholders included) and bump
 * program.agreementVersion in config.ts whenever the text changes.
 */
export function AgreementText() {
  return (
    <>
      <h4>1. The program</h4>
      <p>{program.company} ("we", "us") runs a referral program. As a partner ("you"), you introduce local businesses that need a website to us.</p>
      <h4>2. Your referral code</h4>
      <p>If your application is approved, we email you a unique referral code. A referral counts when a business uses your code or names you when it signs up, wasn't already talking to us, and pays for a website.</p>
      <h4>3. Your payout</h4>
      <p>
        You earn 40% of the referred business's first website payment. The amount depends on the plan or price the
        business pays. For example, a {money(program.mainPlanPrice)} website pays you {money(payoutFor(program.mainPlanPrice))}.
        You don't earn anything from the business's monthly subscription or any later payments.
      </p>
      <h4>4. When you're paid</h4>
      <p>We send your payout only after the business has paid, within <Ph>{program.payoutDays}</Ph>, by <Ph>{program.paymentMethod}</Ph>. If a business never pays, no payout is owed.</p>
      <h4>5. Refunds</h4>
      <p><Ph>{program.refundPolicy}</Ph></p>
      <h4>6. No cost, no obligation</h4>
      <p>Joining is free. You're not required to refer anyone, and you don't need to sell or do anything technical. We handle the conversation, design and build.</p>
      <h4>7. Our relationship</h4>
      <p>You're an independent partner, not an employee or agent of {program.company}. This is not an employment offer. You can't make promises, set prices or sign agreements on our behalf.</p>
      <h4>8. Honest promotion</h4>
      <p>Describe our services accurately. Don't promise results or prices we haven't confirmed, and don't send spam or contact businesses that ask you not to.</p>
      <h4>9. Taxes</h4>
      <p>You're responsible for any taxes on your payouts.</p>
      <h4>10. Ending the partnership</h4>
      <p>Either of us can end this agreement at any time by email. Payouts for businesses that paid before the end date will still be sent.</p>
      <h4>11. Changes</h4>
      <p>We may update these terms. We'll email you before any change takes effect. <Ph>{program.governingLaw}</Ph></p>
      <p style={{ marginTop: 22, fontWeight: 600, color: 'var(--ink)' }}>End of agreement.</p>
    </>
  );
}

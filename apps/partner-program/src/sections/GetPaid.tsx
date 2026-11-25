import { Eyebrow } from '../components/Eyebrow';
import { BankIcon, MailIcon, SkipIcon } from '../components/Icons';

/**
 * How payouts arrive: by ACH to the bank account the partner adds on
 * Mercury's own form. The mock on the right shows Mercury's "create a
 * profile" page with the Skip link partners should click: no account needed.
 * Styled on Mercury's palette (dark purple-base, #4d68eb accent, pill
 * buttons, medium weights) so it reads as "this part happens at Mercury".
 */
const STEPS = [
  {
    icon: MailIcon,
    title: 'We send a Mercury invite',
    text: "Mercury is the business bank we use. When you're approved, Mercury emails you a secure link. Click it.",
  },
  {
    icon: SkipIcon,
    title: 'Click Skip',
    text: "Mercury offers a free Recipient Profile. You don't need one. Click Skip at the bottom right and you go straight to the bank form.",
  },
  {
    icon: BankIcon,
    title: 'Add your bank, once',
    text: 'Enter your routing and account number, or sign in to your bank. Mercury may ask for a W-9. Mercury stores it; we never see your account number.',
  },
];

export function GetPaid() {
  return (
    <section id="get-paid" aria-labelledby="paid-h" className="section section--mercury">
      <div className="container">
        <div className="paid__eyebrow" data-reveal="1">
          <Eyebrow>How you get paid</Eyebrow>
          <span className="paid__via">
            via <img src="/mercury-wordmark-white.svg" alt="Mercury" width={78} height={18} />
          </span>
        </div>
        <h2 id="paid-h" className="h2" data-reveal="2">Paid straight to your bank. No app to install, no account to open.</h2>
        <div className="paid">
          <ol className="paid__steps" data-reveal="3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="paid__step">
                <span className="paid__num" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="paid__title"><Icon size={20} color="currentColor" /> {title}</h3>
                  <p className="body-2">{text}</p>
                </div>
              </li>
            ))}
            <li className="paid__note">
              Payouts arrive by ACH in 1 to 2 business days, nothing taken out on the way. Mercury is a US business
              banking platform; every payout is sent from our account there.
            </li>
          </ol>

          <div className="mock" aria-hidden="true" data-reveal="4">
            <div className="mock__bar">
              <img src="/mercury-wordmark.svg" alt="" width={104} height={24} />
            </div>
            <div className="mock__body">
              <p className="mock__h">Get paid effortlessly and securely, every time</p>
              <p className="mock__p">Create your free Mercury Profile to receive this payment.</p>
              <div className="mock__row">
                <span className="mock__field">First name</span>
                <span className="mock__field">Last name</span>
              </div>
              <span className="mock__field">Email</span>
              <span className="mock__field">Business type</span>
              <span className="mock__field">Password</span>
              <div className="mock__actions">
                <span className="mock__continue">Continue →</span>
                <span className="mock__skip">Skip</span>
              </div>
            </div>
            <div className="mock__callout">
              <span className="mock__callout-arrow" />
              Click <strong>Skip</strong>. No account needed.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

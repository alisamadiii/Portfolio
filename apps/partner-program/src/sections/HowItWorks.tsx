import { Eyebrow } from '../components/Eyebrow';
import { CashIcon, PenIcon, ShareIcon } from '../components/Icons';
import { Ph } from '../components/Placeholder';
import { program } from '../config';

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="section section--white" style={{ borderTop: 0 }}>
      <div className="container">
        <Eyebrow reveal="1">How it works</Eyebrow>
        <h2 id="how-h" className="h2" data-reveal="2">You make the introduction. We do the rest.</h2>
        <div className="steps" data-reveal="3">
          <div className="steps__line" aria-hidden="true"><div className="steps__line-fill" /></div>
          <ol className="steps__list">
            <li className="step">
              <span className="step-icon"><PenIcon size={26} color="#F7F6F4" /></span>
              <p className="step__num">Step 1</p>
              <h3 className="step__title">Apply</h3>
              <p className="body-2">Fill in the short application. We review every one by hand and email approved partners their referral code.</p>
            </li>
            <li className="step">
              <span className="step-icon"><ShareIcon size={26} color="#F7F6F4" /></span>
              <p className="step__num">Step 2</p>
              <h3 className="step__title">Refer</h3>
              <p className="body-2">Share your code with a business that needs a website. They mention it or use it when they sign up, so the referral is tracked to you.</p>
            </li>
            <li className="step">
              <span className="step-icon"><CashIcon size={26} color="#F7F6F4" /></span>
              <p className="step__num">Step 3</p>
              <h3 className="step__title">Get paid</h3>
              <p className="body-2">
                40% of their first payment, after they pay. Sent within <Ph>{program.payoutDays}</Ph> by <Ph>{program.paymentMethod}</Ph>.
              </p>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

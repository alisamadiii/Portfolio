import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, DownloadIcon } from '../components/Icons';
import { contact } from '../config';
import { todayLabel } from './form';

export function Done({ signature, pdfUrl }: { signature: string; pdfUrl: string | null }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="done">
      <span className="done__check"><CheckIcon size={36} color="var(--success)" /></span>
      <h1 ref={titleRef} tabIndex={-1} className="done__title">Thank you for your submission</h1>
      <p role="status" className="body-2" style={{ fontSize: 18 }}>
        We've received your application. We're checking it now, and once everything looks good, we'll email you to confirm.
      </p>

      {pdfUrl && <div className="pdf-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <span className="pdf-icon" aria-hidden="true">PDF</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>Signed Partner Agreement</p>
            <p className="muted" style={{ fontSize: 14 }}>Signed by {signature} on {todayLabel()}</p>
          </div>
        </div>
        <a className="btn-ink btn-ink--lg" href={pdfUrl} download="partner-agreement.pdf">
          <DownloadIcon size={18} />Download PDF
        </a>
      </div>}

      <h2 style={{ margin: '36px 0 16px', fontSize: 18, fontWeight: 700 }}>What happens next</h2>
      <ol className="next-steps">
        <li><span className="next-steps__num">1</span><span>We review your application by hand.</span></li>
        <li><span className="next-steps__num">2</span><span>Once approved, we email you to confirm, with your unique referral code.</span></li>
        <li><span className="next-steps__num next-steps__num--coral">3</span><span>Share your code with businesses that need a website.</span></li>
      </ol>

      <p className="muted" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--line)', fontSize: 15 }}>
        Questions? Email <a href={`mailto:${contact.email}`}>{contact.email}</a>.{' '}
        <Link to="/" style={{ marginLeft: 8 }}>Back to the Partner Program</Link>
      </p>
    </div>
  );
}

import { useEffect, useRef, type ChangeEvent } from 'react';
import { contact, program } from '../config';
import { AgreementText } from './AgreementText';
import { TextAreaField, TextField } from './Field';
import type { Errors, FieldName, FormValues } from './form';
import { todayLabel } from './form';

type StepProps = {
  values: FormValues;
  errors: Errors; // only the errors that should be visible right now
  onChange: (name: FieldName, value: string | boolean) => void;
  onBlur: (name: FieldName) => void;
};

const text = (props: StepProps, name: FieldName) => ({
  value: props.values[name] as string,
  error: props.errors[name],
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChange(name, e.target.value),
  onBlur: () => props.onBlur(name),
});

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 id="step-h" className="wizard__title" tabIndex={-1}>{title}</h2>
      <p className="body-2" style={{ marginTop: 6 }}>{sub}</p>
    </div>
  );
}

export function StepAbout(props: StepProps) {
  return (
    <div className="wizard__step">
      <StepHeading title="About you" sub="How we'll reach you about your application." />
      <TextField id="fullName" label="Full name" type="text" autoComplete="name" required {...text(props, 'fullName')} />
      <div className="grid-fields">
        <TextField id="email" label="Email" type="email" autoComplete="email" inputMode="email" required readOnly hint="From your Client Hub account." {...text(props, 'email')} />
        <TextField id="phone" label={<>Phone <span className="label__opt">(optional)</span></>} type="tel" autoComplete="tel" inputMode="tel" {...text(props, 'phone')} />
      </div>
    </div>
  );
}

export function StepNetwork(props: StepProps) {
  return (
    <div className="wizard__step">
      <StepHeading title="Your network" sub="All optional. A few words here help us review your application faster, or skip this step." />
      <div className="grid-fields">
        <TextField id="occupation" label={<>Business or occupation <span className="label__opt">(optional)</span></>} type="text" autoComplete="organization-title" placeholder="e.g. Barber, realtor, handyman" {...text(props, 'occupation')} />
        <TextField id="city" label={<>City <span className="label__opt">(optional)</span></>} type="text" autoComplete="address-level2" {...text(props, 'city')} />
      </div>
      <TextAreaField id="knowOwners" label={<>How do you know local business owners? <span className="label__opt">(optional)</span></>} {...text(props, 'knowOwners')} />
      <TextAreaField id="whyJoin" label={<>Why do you want to join? <span className="label__opt">(optional)</span></>} {...text(props, 'whyJoin')} />
    </div>
  );
}

export function StepAgreement(props: StepProps & { hasRead: boolean; onRead: () => void }) {
  const { values, errors, onChange, hasRead, onRead } = props;
  const boxRef = useRef<HTMLDivElement>(null);

  // If the box is tall enough to show everything, count it as read.
  useEffect(() => {
    const b = boxRef.current;
    if (b && !hasRead && b.scrollHeight <= b.clientHeight + 16) onRead();
  }, [hasRead, onRead]);

  const hasSig = !!values.signature.trim();
  const hasIni = !!values.initials.trim();

  return (
    <div className="wizard__step">
      <StepHeading title="Partner agreement" sub="Please read the whole agreement, then sign below. After you submit, you can download it as a signed PDF." />

      <div className="agreement">
        <div className="agreement__head">
          <span>{program.company} Partner Agreement</span>
          <span>Version {program.agreementVersion}</span>
        </div>
        <div
          id="agreement"
          ref={boxRef}
          className="agreement__body"
          role="region"
          aria-label="Partner Agreement text"
          tabIndex={0}
          onScroll={(e) => {
            const t = e.currentTarget;
            if (!hasRead && t.scrollTop + t.clientHeight >= t.scrollHeight - 16) onRead();
          }}
        >
          <AgreementText />
        </div>
      </div>

      {hasRead ? (
        <p className="field-hint read-ok"><span aria-hidden="true">✓ </span>You've read the full agreement.</p>
      ) : (
        <p className="field-hint"><span aria-hidden="true" style={{ color: 'var(--coral-ink)', fontWeight: 700 }}>↓ </span>Scroll to the end of the agreement to sign it.</p>
      )}

      <div className="field-group">
        <label htmlFor="agree" className="checkbox-card">
          <input
            className="checkbox"
            id="agree"
            name="agree"
            type="checkbox"
            disabled={!hasRead}
            checked={values.agree}
            aria-invalid={!!errors.agree}
            aria-describedby={errors.agree ? 'agree-err' : undefined}
            onChange={(e) => onChange('agree', e.target.checked)}
          />
          <span>I've read and agree to the Partner Agreement. I understand payouts are one-time, 40% of a referred client's first payment, sent after they pay.</span>
        </label>
        {errors.agree && <p className="field-error" id="agree-err">✕ {errors.agree}</p>}
      </div>

      <div className="grid-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <TextField
          id="signature"
          label="Signature"
          type="text"
          autoComplete="off"
          placeholder="Type your full name"
          hint={<>Type your full name exactly as above: {values.fullName}</>}
          {...text(props, 'signature')}
        />
        <TextField id="initials" label="Initials" type="text" autoComplete="off" maxLength={6} placeholder="e.g. J.R." {...text(props, 'initials')} />
      </div>

      <div className="sig-preview" role="group" aria-label="Signature preview">
        <p className="eyebrow" style={{ marginBottom: 6, fontSize: 13 }}>How it appears on your PDF</p>
        <div className="sig-preview__row">
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <p className={`sig${hasSig ? '' : ' sig--empty'}`} style={{ minHeight: 52, fontSize: 44 }}>{hasSig ? values.signature : 'Your signature'}</p>
            <div className="sig-line">Partner signature</div>
          </div>
          <div style={{ flex: '0 1 120px' }}>
            <p className={`sig${hasIni ? '' : ' sig--empty'}`} style={{ minHeight: 52, fontSize: 40 }}>{hasIni ? values.initials : 'J.R.'}</p>
            <div className="sig-line">Initials</div>
          </div>
          <div style={{ flex: '0 1 180px' }}>
            <p style={{ minHeight: 52, display: 'flex', alignItems: 'flex-end', paddingBottom: 6, fontSize: 17, fontWeight: 600 }}>{todayLabel()}</p>
            <div className="sig-line">Date</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepReview({ values, onEdit, failed, message }: { values: FormValues; onEdit: (step: 1 | 2 | 3) => void; failed: boolean; message?: string | null }) {
  return (
    <div className="wizard__step" style={{ gap: 20 }}>
      <StepHeading title="Review and submit" sub="Check everything below. Use Edit to change anything before you submit." />

      <section className="review-card" aria-labelledby="r1">
        <div className="review-card__head">
          <h3 id="r1" style={{ fontSize: 18 }}>About you</h3>
          <button type="button" className="edit-btn" onClick={() => onEdit(1)} aria-label="Edit About you">Edit</button>
        </div>
        <dl>
          <div><dt>Full name</dt><dd>{values.fullName}</dd></div>
          <div><dt>Email</dt><dd>{values.email}</dd></div>
          <div><dt>Phone</dt><dd>{values.phone.trim() || 'Not provided'}</dd></div>
        </dl>
      </section>

      <section className="review-card" aria-labelledby="r2">
        <div className="review-card__head">
          <h3 id="r2" style={{ fontSize: 18 }}>Your network</h3>
          <button type="button" className="edit-btn" onClick={() => onEdit(2)} aria-label="Edit Your network">Edit</button>
        </div>
        <dl>
          <div><dt>Business or occupation</dt><dd>{values.occupation.trim() || 'Not provided'}</dd></div>
          <div><dt>City</dt><dd>{values.city.trim() || 'Not provided'}</dd></div>
        </dl>
        <dl className="stack" style={{ marginTop: 14 }}>
          <div><dt>How you know local business owners</dt><dd>{values.knowOwners.trim() || 'Not provided'}</dd></div>
          <div><dt>Why you want to join</dt><dd>{values.whyJoin.trim() || 'Not provided'}</dd></div>
        </dl>
      </section>

      <section className="review-card" aria-labelledby="r3">
        <div className="review-card__head">
          <h3 id="r3" style={{ fontSize: 18 }}>Partner agreement</h3>
          <button type="button" className="edit-btn" onClick={() => onEdit(3)} aria-label="Edit Partner agreement signature">Edit</button>
        </div>
        <p className="read-ok" style={{ marginTop: 10, fontSize: 15 }}><span aria-hidden="true">✓ </span>Read and agreed</p>
        <div className="sig-preview__row" style={{ marginTop: 12, gap: '12px 36px' }}>
          <div style={{ minWidth: 0 }}><p className="sig" style={{ fontSize: 38 }}>{values.signature}</p><p className="muted" style={{ fontSize: 14 }}>Signature</p></div>
          <div><p className="sig" style={{ fontSize: 34 }}>{values.initials}</p><p className="muted" style={{ fontSize: 14 }}>Initials</p></div>
          <div><p style={{ marginBottom: 4, fontWeight: 600 }}>{todayLabel()}</p><p className="muted" style={{ fontSize: 14 }}>Date</p></div>
        </div>
        <p className="muted" style={{ marginTop: 14, fontSize: 14 }}>After you submit, you'll be able to download the signed agreement as a PDF.</p>
      </section>

      {failed && (
        <div role="alert" className="alert" style={{ padding: 18, color: 'var(--ink)' }}>
          <span className="alert__icon" aria-hidden="true">!</span>
          <div>
            <p style={{ fontWeight: 600 }}>We couldn't send your application.</p>
            <p className="body-2" style={{ marginTop: 4, fontSize: 15, fontWeight: 400 }}>
              {message ? <>{message}{' '}</> : <>Your answers are still here, so nothing is lost. Please try again in a moment. </>}
              If it keeps happening, email us at <a href={`mailto:${contact.email}`}>{contact.email}</a>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

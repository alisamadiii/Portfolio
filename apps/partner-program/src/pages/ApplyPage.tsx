import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApplyHeader } from '../components/Header';
import { ApplicationError, getMe, submitApplication, AGREEMENT_VERSION, type Me } from '../lib/api';
import { hub } from '../config';
import { prefersReducedMotion } from '../lib/motion';
import { Done } from '../apply/Done';
import { EMPTY_VALUES, STEPS, STEP_FIELDS, validate, type Errors, type FieldName, type FormValues, type StepNumber } from '../apply/form';
import { StepAbout, StepAgreement, StepNetwork, StepReview } from '../apply/Steps';

type Status = 'idle' | 'loading' | 'error' | 'done';

/** Applying requires a Client Hub account: the application is tied to it. */
export default function ApplyPage() {
  const [me, setMe] = useState<Me | 'loading' | 'error'>('loading');
  useEffect(() => {
    document.title = 'Apply | Partner Program | Ali Samadii LLC';
    getMe().then(setMe, () => setMe('error'));
  }, []);

  if (me !== 'loading' && me !== 'error' && me.user && !me.partner) {
    return <ApplyForm account={me.user} />;
  }

  const here = window.location.href;
  return (
    <>
      <ApplyHeader />
      <main className="apply-main">
        <div className="gate">
          {me === 'loading' && <p className="muted" role="status">Checking your account…</p>}
          {me === 'error' && (
            <>
              <h1 className="gate__title">We couldn't reach our server</h1>
              <p className="body-2">Please refresh the page in a moment.</p>
            </>
          )}
          {me !== 'loading' && me !== 'error' && !me.user && (
            <>
              <p className="eyebrow" style={{ marginBottom: 10 }}><span className="eyebrow__dot" aria-hidden="true" />Partner application</p>
              <h1 className="gate__title">Sign in to apply</h1>
              <p className="body-2">
                Applications are tied to a free Client Hub account. That's where you'll see your referral code, the
                businesses you referred and your payouts. It takes a minute, and you come right back here.
              </p>
              <div className="gate__actions">
                <a className="btn" href={hub.signUp(here)}>Create a free account</a>
                <a className="btn-outline" href={hub.signIn(here)}>I have an account</a>
              </div>
            </>
          )}
          {me !== 'loading' && me !== 'error' && me.user && me.partner && (
            <>
              <h1 className="gate__title">
                {me.partner.status === 'approved' ? "You're already a partner" : "You've already applied"}
              </h1>
              <p className="body-2">
                {me.partner.status === 'pending' && "We're reviewing your application by hand and will email you soon."}
                {me.partner.status === 'approved' && 'Your referral code, referrals and payouts are in Client Hub.'}
                {me.partner.status === 'rejected' && "We couldn't approve your application this time. Thanks again for your interest."}
              </p>
              <div className="gate__actions">
                <a className="btn" href={hub.partnerPage}>Open Client Hub</a>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function ApplyForm({ account }: { account: { name: string; email: string } }) {
  const [step, setStep] = useState<StepNumber>(1);
  const [maxStep, setMaxStep] = useState<StepNumber>(1);
  const [fromReview, setFromReview] = useState(false);
  const [values, setValues] = useState<FormValues>(() => ({
    ...EMPTY_VALUES,
    fullName: account.name,
    email: account.email,
  }));
  const [hasRead, setHasRead] = useState(false);
  const [tried, setTried] = useState<Partial<Record<StepNumber, boolean>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const focusPending = useRef(false);

  const allErrors = useMemo(() => validate(values, hasRead), [values, hasRead]);

  // Only show errors for the current step, after a Continue attempt or after leaving a field.
  const visibleErrors: Errors = useMemo(() => {
    if (step === 4) return {};
    const out: Errors = {};
    for (const f of STEP_FIELDS[step]) {
      if ((tried[step] || touched[f]) && allErrors[f]) out[f] = allErrors[f];
    }
    return out;
  }, [step, tried, touched, allErrors]);
  const triedErrorCount = step !== 4 && tried[step] ? Object.keys(visibleErrors).length : 0;

  // Move focus to the new step's heading so keyboard and screen reader users follow along.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const h = document.getElementById('step-h');
    if (!h) return;
    h.focus({ preventScroll: true });
    const top = h.getBoundingClientRect().top + window.scrollY - 140;
    if (top < window.scrollY) window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [step]);

  const go = (n: StepNumber, returnToReview = false) => {
    focusPending.current = true;
    setStep(n);
    setMaxStep((m) => (n > m ? n : m));
    setFromReview(returnToReview);
    if (status === 'error') setStatus('idle');
  };

  const onChange = (name: FieldName, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (status === 'error') setStatus('idle');
  };
  const onBlur = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const onRead = useCallback(() => setHasRead(true), []);

  const submit = async () => {
    // Safety net: if something is invalid, jump to that step.
    for (const s of [1, 2, 3] as const) {
      if (STEP_FIELDS[s].some((f) => allErrors[f])) {
        setTried((t) => ({ ...t, [s]: true }));
        go(s, true);
        return;
      }
    }
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await submitApplication({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        occupation: values.occupation.trim(),
        city: values.city.trim(),
        knowOwners: values.knowOwners.trim(),
        whyJoin: values.whyJoin.trim(),
        agreement: {
          version: AGREEMENT_VERSION,
          accepted: true,
          signature: values.signature.trim(),
          initials: values.initials.trim(),
          signedAt: new Date().toISOString(),
        },
      });
      if (res.pdfUrl) setPdfUrl(res.pdfUrl);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err instanceof ApplicationError ? err.userMessage : null);
      setStatus('error');
    }
  };

  const onNext = (e: FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    if (step === 4) {
      void submit();
      return;
    }
    const bad = STEP_FIELDS[step].filter((f) => allErrors[f]);
    if (bad.length) {
      setTried((t) => ({ ...t, [step]: true }));
      const target = bad[0] === 'agree' && !hasRead ? 'agreement' : bad[0];
      document.getElementById(target)?.focus();
      return;
    }
    go(fromReview ? 4 : ((step + 1) as StepNumber));
  };

  if (status === 'done') {
    return (
      <>
        <ApplyHeader />
        <main className="apply-main">
          <Done signature={values.signature.trim()} pdfUrl={pdfUrl} />
        </main>
      </>
    );
  }

  const isLoading = status === 'loading';
  const stepProps = { values, errors: visibleErrors, onChange, onBlur };
  const nextLabel = step === 4 ? (isLoading ? 'Submitting…' : 'Submit application') : fromReview ? 'Save and review' : 'Continue';

  return (
    <>
      <ApplyHeader />
      <main className="apply-main">
        <div style={{ marginBottom: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}><span className="eyebrow__dot" aria-hidden="true" />Partner application</p>
          <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Apply to become a partner</h1>
        </div>

        <div className="apply-layout">
          <nav className="stepper" aria-label="Application steps">
            <ol className="stepper__list">
              {STEPS.map((s, i) => {
                const n = (i + 1) as StepNumber;
                const current = n === step;
                const done = !current && n < maxStep;
                const clickable = !current && n <= maxStep && !isLoading;
                const cls = `stepper__item${current ? ' stepper__item--current' : done ? ' stepper__item--done' : ''}`;
                const inner = (
                  <>
                    <span className="stepper__dot" aria-hidden="true">{done ? '✓' : n}</span>
                    <span><span className="stepper__label">{s.label}</span><span className="stepper__desc">{s.desc}</span></span>
                  </>
                );
                return (
                  <li key={s.label}>
                    {clickable ? (
                      <button type="button" className={cls} onClick={() => go(n, maxStep === 4 && n < 4)}>{inner}</button>
                    ) : (
                      <div className={cls} aria-current={current ? 'step' : undefined}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="muted" style={{ margin: '24px 12px 0', fontSize: 14 }}>Your answers are kept as you move between steps.</p>
          </nav>

          <form className="wizard" noValidate onSubmit={onNext} aria-labelledby="step-h">
            <div className="wizard__top">
              <div className="wizard__meta"><span>Step {step} of 4</span><span>{STEPS[step - 1].label}</span></div>
              <div className="wizard__bar" aria-hidden="true"><div style={{ width: `${(step / 4) * 100}%` }} /></div>
            </div>

            <fieldset className="wizard__body" disabled={isLoading}>
              {triedErrorCount > 1 && (
                <div role="alert" className="alert" style={{ marginBottom: 24 }}>
                  <span aria-hidden="true" style={{ fontWeight: 700 }}>✕</span>
                  <span>Please fix {triedErrorCount} fields below to continue.</span>
                </div>
              )}

              {step === 1 && <StepAbout key="s1" {...stepProps} />}
              {step === 2 && <StepNetwork key="s2" {...stepProps} />}
              {step === 3 && <StepAgreement key="s3" {...stepProps} hasRead={hasRead} onRead={onRead} />}
              {step === 4 && <StepReview key="s4" values={values} onEdit={(n) => go(n, true)} failed={status === 'error'} message={errorMessage} />}

              <div className="wizard__nav">
                <div>
                  {step > 1 && (
                    <button type="button" className="btn-outline" onClick={() => go((step - 1) as StepNumber)}>
                      <span aria-hidden="true">←</span>Back
                    </button>
                  )}
                </div>
                <div className="wizard__next">
                  {step === 2 && (
                    <button type="button" className="btn-text" onClick={() => go(fromReview ? 4 : 3)}>
                      Skip
                    </button>
                  )}
                  <button className="btn btn--wide" type="submit" disabled={isLoading} aria-busy={isLoading}>
                    {isLoading && <span className="spin" aria-hidden="true" />}
                    <span>{nextLabel}</span>
                    {step < 4 && <span className="arr" aria-hidden="true">→</span>}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </main>
    </>
  );
}

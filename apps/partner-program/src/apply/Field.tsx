import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

type Common = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
};

export function TextField({ id, label, error, hint, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field-group">
      <label className="label" htmlFor={id}>{label}</label>
      <input className="field" id={id} name={id} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`}>✕ {error}</p>}
    </div>
  );
}

export function TextAreaField({ id, label, error, hint, ...input }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field-group">
      <label className="label" htmlFor={id}>{label}</label>
      <textarea className="field" id={id} name={id} rows={4} aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`}>✕ {error}</p>}
    </div>
  );
}

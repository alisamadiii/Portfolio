export type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  city: string;
  knowOwners: string;
  whyJoin: string;
  agree: boolean;
  signature: string;
  initials: string;
};

export type FieldName = keyof FormValues;
export type Errors = Partial<Record<FieldName, string>>;
export type StepNumber = 1 | 2 | 3 | 4;

export const EMPTY_VALUES: FormValues = {
  fullName: '',
  email: '',
  phone: '',
  occupation: '',
  city: '',
  knowOwners: '',
  whyJoin: '',
  agree: false,
  signature: '',
  initials: '',
};

export const STEP_FIELDS: Record<1 | 2 | 3, FieldName[]> = {
  1: ['fullName', 'email', 'phone'],
  2: ['occupation', 'city', 'knowOwners', 'whyJoin'],
  3: ['agree', 'signature', 'initials'],
};

export const STEPS: { label: string; desc: string }[] = [
  { label: 'About you', desc: 'Name, email and phone' },
  { label: 'Your network', desc: 'Optional: who you know and why' },
  { label: 'Partner agreement', desc: 'Read and sign' },
  { label: 'Review', desc: 'Check and submit' },
];

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export function validate(v: FormValues, hasReadAgreement: boolean): Errors {
  const e: Errors = {};
  const phoneDigits = v.phone.replace(/\D/g, '');

  if (!v.fullName.trim()) e.fullName = 'Please enter your full name.';
  if (!v.email.trim()) e.email = 'Please enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Please enter a valid email, like name@example.com.';
  if (phoneDigits && phoneDigits.length < 10) e.phone = 'Please enter a full phone number with area code, or leave it blank.';

  // Step 2 (Your network) is optional: it helps us review, nothing more.

  if (!hasReadAgreement) e.agree = 'Please read the agreement to the end first.';
  else if (!v.agree) e.agree = "Please confirm you've read and agree to the Partner Agreement.";
  if (!v.signature.trim()) e.signature = 'Please type your full name to sign.';
  else if (norm(v.signature) !== norm(v.fullName)) e.signature = `Your signature should match the name you entered: ${v.fullName.trim()}`;
  if (!v.initials.trim()) e.initials = 'Please add your initials.';
  else if (!/^[A-Za-z][A-Za-z.\s]{0,5}$/.test(v.initials.trim())) e.initials = 'Use letters only, like J.R.';

  return e;
}

export function todayLabel(d = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

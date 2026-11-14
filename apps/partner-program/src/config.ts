/**
 * Everything you may need to change in one place.
 * Values in [square brackets] are placeholders: they show up highlighted
 * on the page until you replace them.
 */
export const program = {
  company: 'Ali Samadii LLC',
  payoutRate: 0.4,

  // Placeholders: fill these in.
  payoutDays: '[X days]',
  paymentMethod: '[payment method]',
  paymentMethodExamples: '[payment method, e.g. PayPal, Zelle or bank transfer]',
  approvalDays: '[X]',
  refundPolicy: '[Your policy, e.g. no payout until the refund window closes.]',
  taxNote: '[We may ask for tax information, such as a W-9, before paying you.]',
  governingLaw: '[Governing law, e.g. State of Florida.]',
  agreementVersion: '2026-11',

  // Product facts used in examples.
  mainPlanPrice: 699,
  largerPlanPrice: 1199,
  hubMonthly: 25,
};

export const contact = {
  email: 'a@alisamadii.com',
  phone: '(971) 382-8969',
  phoneHref: 'tel:+19713828969',
  address: '566 Kit St, Jacksonville, FL',
  website: 'https://www.alisamadii.com',
  privacy: 'https://alisamadii.com/privacy',
  terms: 'https://alisamadii.com/terms',
};

const HUB = import.meta.env.DEV ? 'http://localhost:3007' : 'https://app.alisamadii.com';

/** Client Hub sign-in / sign-up that returns to `returnTo` (applying requires an account). */
export const hub = {
  url: HUB,
  signIn: (returnTo: string) => `${HUB}/sign-in?redirectUrl=${encodeURIComponent(returnTo)}`,
  signUp: (returnTo: string) => `${HUB}/sign-up?redirectUrl=${encodeURIComponent(returnTo)}`,
  partnerPage: `${HUB}/partner`,
};

export const api = {
  // POST JSON here. Set VITE_API_BASE in .env if your API lives on another domain.
  apply: `${import.meta.env.VITE_API_BASE ?? ''}/api/partners/apply`,
  // The signed-in Client Hub account and whether it already applied.
  me: `${import.meta.env.VITE_API_BASE ?? ''}/api/partners/me`,
};

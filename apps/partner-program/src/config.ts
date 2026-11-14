/**
 * Everything you may need to change in one place.
 * Values in [square brackets] are placeholders: they show up highlighted
 * on the page until you replace them.
 */
export const program = {
  company: 'Ali Samadii LLC',
  payoutRate: 0.4,

  // Program terms (the agreement PDF mirrors these: packages/ui/src/pdfs/partner-agreement.tsx).
  payoutDays: '14 days',
  paymentMethod: 'Zelle or Cash App',
  approvalDays: '2',
  refundPolicy: "If the client gets a refund before your payout is sent, no payout is owed. Once a payout is sent, it's yours to keep.",
  governingLaw: 'This agreement is governed by the laws of the State of Florida.',
  agreementVersion: '2026-11.1',

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

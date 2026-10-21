// Browser-side GA4 event tracking. The typed event map below is the only way
// to send an event — wrong names or params are TS errors. Assumes the gtag
// snippet is already in the page <head> (agency Layout.astro).
import { GOOGLE_ADS_ID, GOOGLE_ADS_QUOTE_LABEL } from "./config";

export { GA_MEASUREMENT_ID, GOOGLE_ADS_ID } from "./config";

export const PLANS = [
  "launch",
  "growth",
  "scale",
  "website",
  "ecommerce",
  "newsletter",
  "custom",
] as const;
export type Plan = (typeof PLANS)[number];

type AnalyticsEvents = {
  // Any /quote?plan=... CTA click (pricing cards, ecommerce page, services).
  select_plan: { plan: Plan };
  quote_form_submit: { plan: Plan };
  // GA4 recommended event — quote request accepted by the API.
  generate_lead: { plan: Plan };
  quote_form_error: { plan: Plan; reason: "rate_limited" | "request_failed" };
  newsletter_submit: undefined;
  // GA4 recommended event — confirmation email sent (double opt-in start).
  sign_up: { method: "newsletter" };
  // Double opt-in completed — user clicked the confirm link in their inbox.
  newsletter_confirmed: undefined;
  newsletter_error: { reason: "rate_limited" | "request_failed" | "network" };
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    // Bridge so is:inline scripts (which can't import modules) stay typed.
    track?: typeof track;
  }
}

export function track<E extends keyof AnalyticsEvents>(
  event: E,
  ...params: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
  // No-op when gtag is absent (ad blockers). Beacon transport so events
  // survive full-page navigations; ClientRouter swaps never unload anyway.
  window.gtag?.("event", event, {
    ...(params[0] ?? {}),
    transport_type: "beacon",
  });
  // A GA4 lead is also the Google Ads "Request quote" conversion.
  if (event === "generate_lead" && GOOGLE_ADS_ID && GOOGLE_ADS_QUOTE_LABEL) {
    window.gtag?.("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_QUOTE_LABEL}`,
      value: 1.0,
      currency: "USD",
      transport_type: "beacon",
    });
  }
}

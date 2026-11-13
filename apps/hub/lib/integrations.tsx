import type { ReactNode } from "react";

import { authClient } from "@workspace/auth/auth-client";

// ─── Integrations registry (client side) ─────────────────────────
// One entry per installable app on the /integrations page. Adding an app =
// one entry here + a matching entry in packages/trpc lib/integrations
// (+ a genericOAuth config in @workspace/auth if it's a new OAuth provider).
// `id` must match the server registry — status rows are joined on it.

const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
export type IntegrationApp = {
  id: string;
  name: string;
  description: string;
  logo: ReactNode;
  /** Kicks off the OAuth consent flow; the provider redirects back to callbackURL. */
  connect: (callbackURL: string) => Promise<{ message?: string } | null>;
  /**
   * Disconnect removes the whole provider link (Better Auth has no per-scope
   * revoke) — set when that deserves an extra warning, i.e. the provider is
   * also a sign-in method.
   */
  unlinkWarning?: string;
};

// linkSocial / oauth2.link redirect the browser to the consent screen on
// success, so callers only ever see the error half of the result.
const toError = (result: { error?: { message?: string } | null }) =>
  result.error ? { message: result.error.message } : null;

const GoogleAnalyticsLogo = (
  <svg className="size-6" viewBox="0 0 24 24">
    <path
      fill="#F9AB00"
      d="M15.5 3.75v16.5c0 1.845 1.273 2.874 2.625 2.874 1.25 0 2.625-.875 2.625-2.874V3.875c0-1.692-1.25-2.75-2.625-2.75S15.5 2.292 15.5 3.75z"
    />
    <path
      fill="#E37400"
      d="M8.625 12v8.25c0 1.845 1.273 2.874 2.625 2.874 1.25 0 2.625-.875 2.625-2.874v-8.125c0-1.692-1.25-2.75-2.625-2.75S8.625 10.542 8.625 12z"
    />
    <circle fill="#E37400" cx="4.375" cy="20.5" r="2.625" />
  </svg>
);

const NetlifyLogo = (
  <svg className="size-6" viewBox="0 0 24 24">
    <path
      fill="#05BDBA"
      d="M6.49 19.04h-.23L5.13 17.9v-.23l1.73-1.71h1.2l.15.15v1.2Zm-1.36-12.7v-.23l1.13-1.13h.23L8.2 6.69v1.2l-.15.15h-1.2Zm9.96 9.09h-1.65l-.14-.13v-3.83c0-.68-.27-1.2-1.1-1.23-.42 0-.9 0-1.43.02l-.07.08v4.96l-.14.14H8.9l-.13-.14V8.73l.13-.14h3.7a2.6 2.6 0 0 1 2.61 2.6v4.1l-.13.14Zm-8.37-2.44H.14L0 12.85v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14Zm17.14 0h-6.58l-.14-.14v-1.64l.14-.14h6.58l.14.14v1.64l-.14.14ZM11.05 6.55V1.64l.14-.14h1.65l.14.14v4.91l-.14.14h-1.65l-.14-.14Zm0 15.81v-4.9l.14-.15h1.65l.14.14v4.91l-.14.14h-1.65l-.14-.14Z"
    />
  </svg>
);

export const INTEGRATION_APPS: IntegrationApp[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Connect your Google account with Analytics access so your website's traffic can power reports.",
    logo: GoogleAnalyticsLogo,
    connect: async (callbackURL) =>
      toError(
        await authClient.linkSocial({
          provider: "google",
          scopes: [GA_SCOPE],
          callbackURL,
        })
      ),
    unlinkWarning:
      "This unlinks your whole Google account from sign-in, not just Analytics.",
  },
  {
    id: "netlify",
    name: "Netlify",
    description:
      "Host uploaded websites on your own Netlify account. Without it, they're hosted on ours.",
    logo: NetlifyLogo,
    connect: async (callbackURL) =>
      toError(
        await authClient.oauth2.link({ providerId: "netlify", callbackURL })
      ),
  },
];

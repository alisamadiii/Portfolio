import type { ReactNode } from "react";

import { authClient } from "@workspace/auth/auth-client";

import { GoogleAnalyticsLogo, NetlifyLogo } from "@/components/ds/brand-logos";
import { connectErrorURL } from "@/lib/connect-errors";

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

export const INTEGRATION_APPS: IntegrationApp[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Connect your Google account with Analytics access so your website's traffic can power reports.",
    logo: <GoogleAnalyticsLogo className="size-6" />,
    connect: async (callbackURL) =>
      toError(
        await authClient.linkSocial({
          provider: "google",
          scopes: [GA_SCOPE],
          callbackURL,
          errorCallbackURL: connectErrorURL("Google Analytics", callbackURL),
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
    logo: <NetlifyLogo className="size-6" />,
    connect: async (callbackURL) =>
      toError(
        await authClient.oauth2.link({
          providerId: "netlify",
          callbackURL,
          errorCallbackURL: connectErrorURL("Netlify", callbackURL),
        })
      ),
  },
];

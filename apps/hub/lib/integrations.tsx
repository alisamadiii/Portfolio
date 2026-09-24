import type { ReactNode } from "react";

import { Github } from "@workspace/ui/icons/social";

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
    id: "github",
    name: "GitHub",
    description:
      "Connect your GitHub account with repository access for reading and updating your website's code.",
    logo: <Github className="size-6" />,
    connect: async (callbackURL) =>
      toError(
        await authClient.linkSocial({
          provider: "github",
          scopes: ["repo"],
          callbackURL,
        })
      ),
    unlinkWarning:
      "This unlinks your whole GitHub account from sign-in, not just repository access.",
  },
];

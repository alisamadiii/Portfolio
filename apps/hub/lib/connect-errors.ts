// ─── OAuth connect errors ────────────────────────────────────────
// Better Auth redirects a failed link (linkSocial / oauth2.link) to its
// errorCallbackURL with ?error=<code>. Without one it lands on the api's
// root, a blank 404. Every connect button passes connectErrorURL(), and
// <ConnectErrorToast /> turns the code into a message on return.

export const CONNECT_ERROR_PARAM = "connect_error";

/** The current page, tagged with the app being connected. */
export function connectErrorURL(app: string, base = window.location.href) {
  const url = new URL(base);
  url.searchParams.set(CONNECT_ERROR_PARAM, app);
  return url.toString();
}

const MESSAGES: Record<string, (app: string) => string> = {
  access_denied: (app) => `Connecting ${app} was cancelled.`,
  account_already_linked_to_different_user: (app) =>
    `That ${app} account is already linked to another Client Hub user. Sign in as that user, or disconnect it there first.`,
  "email_doesn't_match": (app) => `That ${app} account uses a different email than your Client Hub account.`,
};

/** A readable reason for a Better Auth link error code. */
export function connectErrorMessage(app: string, code: string | null) {
  const message = code ? MESSAGES[code] : undefined;
  return message
    ? message(app)
    : `Couldn't connect ${app}. Try again, or contact support if it keeps happening.`;
}

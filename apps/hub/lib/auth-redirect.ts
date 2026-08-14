import { resolveRedirectUrl } from "@workspace/ui/lib/company";

const getSafeRedirect = (redirectTo?: string) => {
  if (!redirectTo) return "/";
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/";
};

// Auth pages accept both the cross-app `redirectUrl` (absolute, validated
// against our own app origins) and the legacy same-app `redirect` (relative).
const resolveAuthTarget = (
  redirectUrl?: string | null,
  redirectTo?: string | null
) => {
  if (redirectUrl) return resolveRedirectUrl(redirectUrl);
  return getSafeRedirect(redirectTo ?? undefined);
};

export { getSafeRedirect, resolveAuthTarget };

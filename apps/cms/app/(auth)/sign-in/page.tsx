import { redirect } from "next/navigation";

import { portalLoginUrl, urls } from "@workspace/ui/lib/company";

import { getSafeRedirect } from "@/lib/auth-redirect";

// The portal owns all login UI — this route only translates the CMS's
// legacy `/sign-in?redirect=...` links into a portal round-trip.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const safeRedirect = getSafeRedirect(redirectTo);

  redirect(
    portalLoginUrl(
      `${urls.cms}${safeRedirect === "/sign-in" ? "/" : safeRedirect}`
    )
  );
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Client website designs (app/client-websites/[slug]) often use root-absolute
// URLs (/images/x.png, a logo linking to /), which the preview iframe then
// asks for at the api root. The Referer says which design asked, so send the
// request back under that design's prefix.
const SITE_REFERER = /^\/client-websites\/([A-Za-z0-9][A-Za-z0-9._-]*)\//;

export function proxy(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (!referer) return NextResponse.next();
  try {
    const from = new URL(referer);
    const slug = SITE_REFERER.exec(from.pathname)?.[1];
    if (slug && from.host === request.headers.get("host")) {
      const { pathname, search } = request.nextUrl;
      // relative Location: behind Coolify's proxy request.url isn't the public host
      return new NextResponse(null, {
        status: 307,
        headers: { Location: `/client-websites/${slug}${pathname}${search}` },
      });
    }
  } catch {
    // unparseable Referer: fall through
  }
  return NextResponse.next();
}

// Everything except the api's own routes, Next internals and the designs.
export const config = {
  matcher: "/((?!api/|_next/|client-websites/|favicon\\.ico).*)",
};

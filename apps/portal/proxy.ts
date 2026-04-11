import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: Request) {
  const nextRequest = request as NextRequest;
  const pathname = nextRequest.nextUrl.pathname;
  const searchParams = nextRequest.nextUrl.searchParams;
  const redirectUrl = searchParams.get("redirectUrl");

  // Check for Better Auth session cookie
  const sessionToken =
    nextRequest.cookies.get("better-auth.session_token")?.value ||
    nextRequest.cookies.get("__Secure-better-auth.session_token")?.value;

  const response = NextResponse.next({
    request: {
      headers: new Headers(nextRequest.headers),
    },
  });

  // Protected routes: redirect to login if no session cookie
  if (
    (pathname.startsWith("/settings") || pathname.startsWith("/agency")) &&
    !sessionToken
  ) {
    return NextResponse.redirect(new URL("/login", nextRequest.url));
  }

  // Auth routes: redirect away if session exists and no redirectUrl
  if (
    (pathname.startsWith("/login") || pathname.startsWith("/signup")) &&
    sessionToken &&
    !redirectUrl
  ) {
    const portfolioUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://alisamadii.com";
    return NextResponse.redirect(portfolioUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

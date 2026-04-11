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
    (pathname === "/" || pathname.startsWith("/agency") || pathname.startsWith("/billing")) &&
    !sessionToken
  ) {
    const loginUrl = new URL("/login", nextRequest.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirectUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: redirect away if session exists and no redirectUrl
  if (
    (pathname.startsWith("/login") || pathname.startsWith("/signup")) &&
    sessionToken &&
    !redirectUrl
  ) {
    return NextResponse.redirect(new URL("/", nextRequest.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

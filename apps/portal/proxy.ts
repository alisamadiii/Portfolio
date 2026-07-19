import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password"];

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

  // Everything is protected except the auth pages themselves
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isPublicPath && !sessionToken) {
    const loginUrl = new URL("/login", nextRequest.url);
    loginUrl.searchParams.set(
      "redirectUrl",
      `${pathname}${nextRequest.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: bounce signed-in users to the dashboard unless they were sent
  // here to be returned somewhere specific
  if (isPublicPath && !pathname.startsWith("/reset-password") && sessionToken && !redirectUrl) {
    return NextResponse.redirect(new URL("/", nextRequest.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

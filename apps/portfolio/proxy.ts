import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@workspace/auth/auth";

export async function proxy(request: Request) {
  const nextRequest = request as NextRequest;
  const pathname = nextRequest.nextUrl.pathname;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Create response with X-User-ID header if session exists
  const response = NextResponse.next({
    request: {
      headers: new Headers(nextRequest.headers),
    },
  });

  if (pathname.startsWith("/settings") && !session?.user?.id) {
    return NextResponse.redirect(new URL("/login", nextRequest.url));
  }

  if (
    (pathname.startsWith("/login") || pathname.startsWith("/signup")) &&
    session?.user?.id
  ) {
    return NextResponse.redirect(new URL("/", nextRequest.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

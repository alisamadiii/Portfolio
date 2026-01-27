import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@workspace/auth/src/auth";

export async function proxy(request: Request) {
  const nextRequest = request as NextRequest;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Create response with X-User-ID header if session exists
  const response = NextResponse.next({
    request: {
      headers: new Headers(nextRequest.headers),
    },
  });

  if (session?.user?.id) {
    response.headers.set("X-User-ID", session.user.id);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

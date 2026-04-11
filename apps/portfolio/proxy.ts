import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: Request) {
  const nextRequest = request as NextRequest;

  const response = NextResponse.next({
    request: {
      headers: new Headers(nextRequest.headers),
    },
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

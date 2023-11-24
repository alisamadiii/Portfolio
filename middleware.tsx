import { NextResponse, type NextRequest } from "next/server";

import { allBlogs } from "./.contentlayer/generated";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (request.nextUrl.pathname.startsWith("/blog/")) {
    const slug = pathname.split("/")[2];
    const hasCompleteBlog = allBlogs.find((blog) => blog.slugAsParams === slug);

    if (hasCompleteBlog?.isComplete === false) {
      return NextResponse.rewrite(new URL("/blog/writing", request.url));
    }
  }

  return NextResponse.next();
}

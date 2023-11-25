import { type NextRequest } from "next/server";

import { limiter } from "../config/limiter";

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams.get("func");

  const remaining = await limiter.removeTokens(1);

  if (remaining > 0) {
    if (searchParams === "rand") {
      const mathRandom = Math.floor(Math.random() * 9238293);
      return new Response(
        JSON.stringify({
          response: "successful",
          value: mathRandom,
          token: remaining,
        }),
        {
          status: 200,
        }
      );
    } else {
      return new Response(JSON.stringify({ response: "Not successful" }), {
        status: 429,
      });
    }
  } else {
    return new Response(JSON.stringify({ response: "out of tokens" }), {
      status: 429,
      statusText: "too many requests",
    });
  }
}

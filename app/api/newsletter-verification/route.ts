import NewsletterVerification from "@/react-email-starter/emails/newsletter-verification";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");

  console.log(to);

  try {
    if (to) {
      const data = await resend.emails.send({
        from: "newsletter-verification@alirezasamadi.com",
        to: [to],
        subject: `Newsletter Verification`,
        react: NewsletterVerification({
          to,
          linkVerification: `${process.env.NEXT_PUBLIC_WEBSITE_URL}/newsletter/approving`,
        }),
      });

      if (data.error) {
        return new Response(
          JSON.stringify({
            response: data.error.name,
            message: data.error.message,
          }),
          {
            status: 403,
          }
        );
      }

      return new Response(JSON.stringify({ id: data.data?.id }), {
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ response: "please add all the fields correctly" }),
      {
        status: 429,
        statusText: "not contains all the fields",
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ response: "unsuccessful" }), {
      status: 400,
    });
  }
}

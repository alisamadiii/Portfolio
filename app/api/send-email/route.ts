import EmailTemplate from "@/components/email-template";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const title = req.nextUrl.searchParams.get("title");
  const details = req.nextUrl.searchParams.get("details");
  const linkTo = req.nextUrl.searchParams.get("link_to");
  const blogImage = req.nextUrl.searchParams.get("blog_image");

  try {
    if (to && title && details && linkTo && blogImage) {
      const data = await resend.emails.send({
        from: "blog@alirezasamadi.com",
        to: to?.split(","),
        subject: `Blog - ${title}`,
        react: EmailTemplate({
          title,
          details,
          linkTo,
          blogImage,
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

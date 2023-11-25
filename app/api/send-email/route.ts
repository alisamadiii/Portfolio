import EmailTemplate from "@/app/components/email-template";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const title = req.nextUrl.searchParams.get("title");
  const username = req.nextUrl.searchParams.get("username");
  const details = req.nextUrl.searchParams.get("details");
  const inviteLink = req.nextUrl.searchParams.get("invite_link");
  const blogImage = req.nextUrl.searchParams.get("blog_image");

  try {
    if (to && title && username && details && inviteLink && blogImage) {
      const data = await resend.emails.send({
        from: "alireza@alirezasamadi.com",
        to: ["aliaghasamadi5@gmail.com"],
        subject:
          "Hi, I am Ali Reza, this email is going to be sent only to a single person",
        react: EmailTemplate({
          title,
          username,
          details,
          inviteLink,
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

    return new Response(JSON.stringify({ response: "please add the fields" }), {
      status: 429,
      statusText: "not contains all the fields",
    });
  } catch (e) {
    return new Response(JSON.stringify({ response: "unsuccessful" }), {
      status: 400,
    });
  }
}

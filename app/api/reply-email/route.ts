import ReplyCommentTemplate from "@/react-email-starter/emails/reply-comment";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  const title = req.nextUrl.searchParams.get("title");
  const comment = req.nextUrl.searchParams.get("comment");
  const blogImage = req.nextUrl.searchParams.get("blog_image");
  const reply = req.nextUrl.searchParams.get("reply");
  const blogLink = req.nextUrl.searchParams.get("blog_link");

  try {
    if (to && title && comment && blogImage && reply && blogLink) {
      const data = await resend.emails.send({
        from: "reply@alirezasamadi.com",
        to: [to],
        subject: `Comment - ${title}`,
        react: ReplyCommentTemplate({
          title,
          reply,
          comment,
          blogImage,
          gmail: to,
          blogLink,
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

import CommentEmailTemplate from "@/react-email-starter/emails/new-comment";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const comment = req.nextUrl.searchParams.get("comment");
  const blogImage = req.nextUrl.searchParams.get("blog_image");
  const gmail = req.nextUrl.searchParams.get("gmail") || undefined;

  try {
    if (title && comment && blogImage) {
      const data = await resend.emails.send({
        from: "comment@alirezasamadi.com",
        to: ["alirs.dev@gmail.com"],
        subject: `Comment - ${title}`,
        react: CommentEmailTemplate({
          title,
          comment,
          blogImage,
          gmail,
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

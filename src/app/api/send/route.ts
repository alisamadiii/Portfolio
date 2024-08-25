import { EmailTemplate } from "@/components/EmailTemplate";
import { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const resData = await req.json();

  try {
    const { data, error } = await resend.emails.send({
      from: "hireme@alirezasamadi.com",
      to: ["alirs.dev@gmail.com"],
      subject: "Hello world",
      react: EmailTemplate({
        firstName: resData.firstName,
        email: resData.email,
        description: resData.description,
      }),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}

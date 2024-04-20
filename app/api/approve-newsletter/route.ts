import { supabase } from "@/utils/supabase";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  console.log(email);

  if (email) {
    const { data } = await supabase
      .from("newsletter")
      .update({ verified: true })
      .eq("email", email)
      .select("*")
      .single();

    if (data) {
      return new Response(JSON.stringify({ response: "approved" }), {
        status: 200,
        statusText: "Approved",
      });
    } else {
      return new Response(
        JSON.stringify({ response: "no account with this email" }),
        {
          status: 404,
          statusText: "Sorry, there is no account with this email!",
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ response: "please add all the fields correctly" }),
    {
      status: 429,
      statusText: "not contains all the fields",
    }
  );
}

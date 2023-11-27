import { supabase } from "@/utils/supabase";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest, context: any) {
  const { slug } = context.params;

  // Check if the environment is production
  if (process.env.NODE_ENV === "production") {
    await supabase.rpc("increment_page_view", {
      page_slug: slug,
    });

    return new Response(
      JSON.stringify({
        message: `Successfully incremented page: ${slug}`,
      }),
      { status: 200 }
    );
  } else {
    return new Response(
      JSON.stringify({
        message: `Page view increment skipped on non-production environment for page: ${slug}`,
      }),
      { status: 200 }
    );
  }
}

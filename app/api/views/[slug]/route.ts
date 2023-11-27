import { supabase } from "@/utils/supabase";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest, context: any) {
  const { slug } = context.params;
  // await supabase.rpc("increment_page_view", {page_slug: req.})
  await supabase.rpc("increment_page_view", {
    page_slug: slug,
  });
  return new Response(
    JSON.stringify({
      message: `Successfully incremented page: ${slug}`,
    }),
    { status: 200 }
  );
}

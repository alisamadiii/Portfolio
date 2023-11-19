import { type NextRequest } from "next/server";
import ogs from "open-graph-scraper";

export async function POST(request: NextRequest) {
  const url = await request.json();

  if (url) {
    try {
      const { result } = await ogs({ url });

      return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
      console.error("Error fetching link info:", error);
    }
  }
}

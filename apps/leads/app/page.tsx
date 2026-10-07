import { headers } from "next/headers";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { MarketingPage } from "@/components/marketing-page";
import { ScanDashboard } from "@/components/scan-dashboard";

// Signed in: the dashboard. Signed out: the marketing pitch (same as /home).
export default async function Home() {
  const httpCaller = createHttpCaller(await headers());

  try {
    await httpCaller.users.getSession.query();
  } catch {
    return <MarketingPage />;
  }

  return <ScanDashboard />;
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { LeadsView } from "@/components/leads-view";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Data is scoped server-side regardless; this just avoids a broken shell.
  const httpCaller = createHttpCaller(await headers());
  let role: string | null = null;
  try {
    role = (await httpCaller.users.getSession.query()).role ?? null;
  } catch {
    redirect("/home");
  }

  return <LeadsView scanId={Number(id)} isAdmin={role === "admin"} />;
}

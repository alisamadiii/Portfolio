import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { WorkspaceView } from "@/components/workspace-view";

export const metadata = { title: "Workspace" };

export default async function WorkspacePage() {
  // Admin-only field tool. Data is admin-gated server-side regardless; this
  // just avoids rendering a shell non-admins can't use.
  const httpCaller = createHttpCaller(await headers());
  let role: string | null = null;
  try {
    role = (await httpCaller.users.getSession.query()).role ?? null;
  } catch {
    role = null;
  }
  if (role !== "admin") redirect("/home");

  return <WorkspaceView />;
}

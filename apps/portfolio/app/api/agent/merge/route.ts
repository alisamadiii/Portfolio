import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { agentProjects } from "@workspace/drizzle/schema";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

import { commitMultipleFiles, mergeBranch } from "@/lib/agent/github";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cookie",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
  const cors = getCorsHeaders(request);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const { projectId, files, action } = await request.json();

  const [project] = await db
    .select()
    .from(agentProjects)
    .where(eq(agentProjects.id, projectId))
    .limit(1);

  if (!project || project.userId !== session.user.id) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: cors });
  }

  const { repoOwner, repoName, previewBranch, productionBranch } = project;

  try {
    // Commit files to preview branch
    if (files && files.length > 0) {
      await commitMultipleFiles(
        repoOwner,
        repoName,
        previewBranch,
        files,
        action === "push-live"
          ? "Publish changes from editor"
          : "Auto-save from editor"
      );
    }

    if (action === "push-live") {
      // Merge preview → production
      await mergeBranch(repoOwner, repoName, previewBranch, productionBranch);
      return Response.json({ success: true, action: "push-live" }, { headers: cors });
    }

    return Response.json({ success: true, action: "push-preview" }, { headers: cors });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Operation failed" },
      { status: 500, headers: cors }
    );
  }
}

import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { agentProjects } from "@workspace/drizzle/schema";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

import { commitMultipleFiles } from "@/lib/agent/github";

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

  const { projectId, files } = await request.json();

  if (!projectId || !files?.length) {
    return Response.json({ error: "projectId and files required" }, { status: 400, headers: cors });
  }

  const [project] = await db
    .select()
    .from(agentProjects)
    .where(eq(agentProjects.id, projectId))
    .limit(1);

  if (!project || project.userId !== session.user.id) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: cors });
  }

  try {
    const commitSha = await commitMultipleFiles(
      project.repoOwner,
      project.repoName,
      project.previewBranch,
      files,
      "Auto-save from editor"
    );

    return Response.json({ success: true, commitSha }, { headers: cors });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Auto-save failed" },
      { status: 500, headers: cors }
    );
  }
}

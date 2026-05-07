import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { agentProjects } from "@workspace/drizzle/schema";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

import { getRepoFiles, getRepoTree, readFile } from "@/lib/agent/github";
import { isPathAllowed } from "@/lib/agent/allowed-paths";

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Cookie",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  const cors = getCorsHeaders(request);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const filePath = url.searchParams.get("path");
  const format = url.searchParams.get("format"); // "webcontainer" for full mount

  if (!projectId) {
    return Response.json({ error: "projectId required" }, { status: 400, headers: cors });
  }

  const [project] = await db
    .select()
    .from(agentProjects)
    .where(eq(agentProjects.id, projectId))
    .limit(1);

  if (!project || project.userId !== session.user.id) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: cors });
  }

  const { repoOwner, repoName, previewBranch } = project;

  try {
    if (filePath) {
      if (!isPathAllowed(filePath, project.allowedPaths)) {
        return Response.json({ error: "Access denied" }, { status: 403, headers: cors });
      }
      const { content } = await readFile(repoOwner, repoName, filePath, previewBranch);
      return Response.json({ path: filePath, content }, { headers: cors });
    }

    // Return full file tree in WebContainer format for mounting
    if (format === "webcontainer") {
      const fsTree = await getRepoFiles(repoOwner, repoName, previewBranch);
      return Response.json({ fsTree }, { headers: cors });
    }

    // Return tree structure (paths only)
    const tree = await getRepoTree(repoOwner, repoName, previewBranch);
    const paths = tree
      .filter((e) => e.type === "blob")
      .map((e) => e.path);
    return Response.json({ tree: paths }, { headers: cors });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to read files" },
      { status: 500, headers: cors }
    );
  }
}

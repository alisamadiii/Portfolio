import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { agentProjects } from "@workspace/drizzle/schema";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";

import { agentTools } from "@/lib/agent/agent-tools";
import { isPathAllowed } from "@/lib/agent/allowed-paths";
import { readFile, listFiles } from "@/lib/agent/github";

const anthropic = new Anthropic();

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

  const { messages, projectId, fileTree } = await request.json();

  const [project] = await db
    .select()
    .from(agentProjects)
    .where(eq(agentProjects.id, projectId))
    .limit(1);

  if (!project || project.userId !== session.user.id) {
    return Response.json({ error: "Project not found" }, { status: 404, headers: cors });
  }

  const systemPrompt = `You are a helpful website editor assistant. You help non-technical users modify their website by editing code files.

Project: ${project.name}
Repository: ${project.repoOwner}/${project.repoName}
Allowed paths: ${project.allowedPaths.length > 0 ? project.allowedPaths.join(", ") : "all files"}

${fileTree?.length ? `## Available Files\n${(fileTree as string[]).filter((p: string) => !p.endsWith("/")).slice(0, 200).join("\n")}` : ""}

Guidelines:
- Always read the current file before editing it
- Make minimal, targeted changes — don't rewrite entire files unnecessarily
- Use Tailwind CSS classes for styling changes
- Explain what you changed in simple, non-technical terms the user can understand
- If the user's request is unclear, ask for clarification before making changes
- Never modify backend logic, authentication, or API routes
- Changes appear instantly in the browser preview via hot reload`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );

        let continueLoop = true;
        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools: agentTools,
            messages: currentMessages,
          });

          for (const block of response.content) {
            if (block.type === "text") {
              controller.enqueue(encoder.encode(`data: ${block.text}\n\n`));
            } else if (block.type === "tool_use") {
              const { toolResult, fileEdit } = await handleToolCall(
                block.name,
                block.input as Record<string, string>,
                project
              );

              // If this was a file edit, emit it as a structured event
              if (fileEdit) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "file_edit", path: fileEdit.path, content: fileEdit.content })}\n\n`
                  )
                );
              }

              currentMessages = [
                ...currentMessages,
                { role: "assistant", content: response.content },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: block.id,
                      content: toolResult,
                    },
                  ],
                },
              ];
            }
          }

          continueLoop = response.stop_reason === "tool_use";
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: Error: ${message}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleToolCall(
  toolName: string,
  input: Record<string, string>,
  project: typeof agentProjects.$inferSelect
): Promise<{ toolResult: string; fileEdit?: { path: string; content: string } }> {
  const { repoOwner, repoName, previewBranch, allowedPaths } = project;

  try {
    switch (toolName) {
      case "read_file": {
        if (!isPathAllowed(input.path, allowedPaths)) {
          return { toolResult: `Error: Access denied. "${input.path}" is outside allowed paths.` };
        }
        const { content } = await readFile(repoOwner, repoName, input.path, previewBranch);
        return { toolResult: content };
      }

      case "edit_file": {
        if (!isPathAllowed(input.path, allowedPaths)) {
          return { toolResult: `Error: Access denied. "${input.path}" is outside allowed paths.` };
        }
        // Don't write to disk — emit the edit for the client to apply to WebContainer
        return {
          toolResult: `Successfully updated ${input.path}. Changes are visible in the preview immediately.`,
          fileEdit: { path: input.path, content: input.content },
        };
      }

      case "list_files": {
        const files = await listFiles(repoOwner, repoName, input.directory || ".", previewBranch);
        return { toolResult: files.join("\n") };
      }

      default:
        return { toolResult: `Error: Unknown tool "${toolName}"` };
    }
  } catch (err) {
    return { toolResult: `Error: ${err instanceof Error ? err.message : "Tool execution failed"}` };
  }
}

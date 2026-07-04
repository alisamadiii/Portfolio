import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../init";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export const clickupRouter = createTRPCRouter({
  getTasks: authenticatedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isClient) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only clients can access requests",
      });
    }

    const apiKey = process.env.CLICKUP_API_TOKEN;
    if (!apiKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "ClickUp API token not configured",
      });
    }

    const listId = process.env.CLICKUP_LIST_ID_CLIENT_REQUESTS;
    if (!listId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "ClickUp list ID not configured",
      });
    }

    const userId = ctx.session.user.id;

    // Fetch tasks and filter by userId custom field on the client side
    // ClickUp API doesn't support filtering by custom field value directly
    const url = `${CLICKUP_API_BASE}/list/${listId}/task?order_by=created&reverse=true&include_closed=true`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: apiKey,
        },
        cache: "no-store",
      });
    } catch (err) {
      console.error("[clickup] Network error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to connect to ClickUp API",
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[clickup] API error:", response.status, body);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch tasks from ClickUp",
      });
    }

    const data = await response.json();
    const allTasks = (data as { tasks?: any[] }).tasks ?? [];

    // Filter tasks where the "user_id" custom field matches the logged-in user
    const userTasks = allTasks.filter((task: any) => {
      const userIdField = task.custom_fields?.find(
        (f: any) => f.name === "User Id (Don't update)" || f.name === "user_id"
      );
      return userIdField?.value === userId;
    });

    return {
      tasks: userTasks.map((task: any) => {
        const filesField = task.custom_fields?.find(
          (f: any) => f.name === "files"
        );
        const files = Array.isArray(filesField?.value)
          ? filesField.value.map((f: any) => ({
              name: f.title as string,
              url: (f.url_w_query ?? f.url) as string,
              thumbnail: (f.thumbnail_small ?? null) as string | null,
            }))
          : [];

        return {
          id: task.id as string,
          name: task.name as string,
          description: (() => {
            const textField = task.custom_fields?.find(
              (f: any) => f.name === "text_content"
            );
            return (
              (textField?.value as string) ??
              (task.text_content as string) ??
              ""
            );
          })(),
          status: (task.status?.status as string) ?? "unknown",
          statusColor: (task.status?.color as string) ?? "#808080",
          type: (() => {
            const typeField = task.custom_fields?.find(
              (f: any) => f.name === "type"
            );
            if (!typeField?.value) return "Other";
            const option = typeField.type_config?.options?.find(
              (o: any) =>
                o.orderindex === typeField.value || o.id === typeField.value
            );
            return (option?.name as string) ?? "Other";
          })(),
          createdAt: task.date_created as string,
          files,
        };
      }),
    };
  }),

  updateTaskStatus: authenticatedProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["IGNORED", "TO DO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isClient) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only clients can access requests",
        });
      }

      const apiKey = process.env.CLICKUP_API_TOKEN;
      if (!apiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ClickUp API token not configured",
        });
      }

      const userId = ctx.session.user.id;

      // Verify task belongs to requesting user
      const taskRes = await fetch(`${CLICKUP_API_BASE}/task/${input.taskId}`, {
        headers: { Authorization: apiKey },
        cache: "no-store",
      });

      if (!taskRes.ok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const task = (await taskRes.json()) as {
        custom_fields?: { name: string; value: string }[];
      };
      const userIdField = task.custom_fields?.find(
        (f) => f.name === "User Id (Don't update)" || f.name === "user_id"
      );
      if (userIdField?.value !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own tasks",
        });
      }

      // Update task status
      const updateRes = await fetch(
        `${CLICKUP_API_BASE}/task/${input.taskId}`,
        {
          method: "PUT",
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: input.status }),
        }
      );

      if (!updateRes.ok) {
        const body = await updateRes.text().catch(() => "");
        console.error("[clickup] Update error:", updateRes.status, body);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update task status",
        });
      }

      return { success: true };
    }),
});

import { TRPCError } from "@trpc/server";
import z from "zod";

import { getErrorMessage } from "@workspace/ui/lib/utils";

import { projectsTypeValues } from "@workspace/drizzle/schema";

import { createTRPCRouter, notificationsProcedure } from "../init";
import { ApiRoutes, clickupApi } from "../lib/clickup.service";

const sendNotificationsSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
});

export const notificationRouter = createTRPCRouter({
  send: notificationsProcedure
    .input(sendNotificationsSchema)
    .mutation(async ({ ctx, input }): Promise<{ id: string }> => {
      try {
        const { name, description, priority } = input;
        const { email, projectType } = ctx;

        const priorityNumber =
          priority === "URGENT"
            ? 1
            : priority === "HIGH"
              ? 2
              : priority === "MEDIUM"
                ? 3
                : 4;

        const custom_fields = [
          {
            id: "36df236c-9d72-421c-812b-64c2641a5e97",
            value: email,
          },
          {
            id: "c9bea937-f935-4ef1-a99b-fc4849748147",
            value: projectsTypeValues.indexOf(projectType),
          },
        ];

        const { data } = await clickupApi.post(
          ApiRoutes(ctx.listId).tasks.create,
          {
            name,
            description,
            priority: priorityNumber,
            custom_fields,
          }
        );

        return data;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: getErrorMessage(error),
          cause: error,
        });
      }
    }),
});

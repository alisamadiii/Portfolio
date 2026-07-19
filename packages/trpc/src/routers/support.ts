import { TRPCError } from "@trpc/server";
import z from "zod";

import { getErrorMessage } from "@workspace/ui/lib/utils";

import { projectsTypeValues } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { notify } from "../lib/notify";
import { rateLimit } from "../middleware/rate-limit";

export const supportRouter = createTRPCRouter({
  send: authenticatedProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        message: z.string().min(10),
        priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
        projectType: z.enum(projectsTypeValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.session.user.role !== "admin") {
          await rateLimit(10, 1800000);
        }

        notify({
          clientEmail: ctx.session.user.email,
          projectType: input.projectType,
          subject: input.subject,
          message: input.message,
          priority: input.priority,
        });

        return { ok: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: getErrorMessage(error),
          cause: error,
        });
      }
    }),
});

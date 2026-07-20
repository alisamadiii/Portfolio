import { TRPCError } from "@trpc/server";
import z from "zod";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { agency } from "../lib/agency";
import { rateLimit } from "../middleware/rate-limit";

export const contactRouter = createTRPCRouter({
  send: authenticatedProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(10, "Message must be at least 10 characters"),
        source: z.string().optional(),
        metadata: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // The agency API allows 1 contact per 10 minutes per IP — fail early
      // with a clearer message instead of round-tripping into its 429.
      await rateLimit(1, 10 * 60 * 1000);

      const { email, name } = ctx.session.user;

      const { error } = await agency().emails.sendContact({
        ...input,
        name: name || email,
        email,
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});

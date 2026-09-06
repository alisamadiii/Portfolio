import { TRPCError } from "@trpc/server";
import z from "zod";

import { email as emailService } from "@workspace/email";
import ContactFormEmail from "@workspace/email/emails/contact-message";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { rateLimit } from "../middleware/rate-limit";

const CONTACT_TO = "agency@alisamadii.com";

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
      await rateLimit(1, 10 * 60 * 1000);

      const { email, name } = ctx.session.user;

      // Free-form metadata rides along at the end of the message body.
      const metadataLines = input.metadata
        ? Object.entries(input.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        : "";
      const message = metadataLines
        ? `${input.message}\n\n—\n${metadataLines}`
        : input.message;

      const { error } = await emailService.send({
        to: CONTACT_TO,
        subject: input.subject,
        react: ContactFormEmail({
          name: name || email,
          email,
          subject: input.subject,
          message,
          pageUrl: input.source,
          submittedAt: new Date().toISOString(),
          clientName: "Ali Samadii LLC",
        }),
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
        });
      }

      return { success: true };
    }),
});

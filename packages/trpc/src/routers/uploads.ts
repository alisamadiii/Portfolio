import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";
import { deleteObject, listObjects, presignUpload } from "../lib/r2";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "application/pdf",
];

/**
 * Non-admins may only write into their own folders. Admins get the whole
 * bucket. `path` is the folder prefix prepended to the object key.
 */
const assertPathAllowed = (path: string | undefined, userId: string) => {
  const normalized = (path ?? "").replace(/^\/+|\/+$/g, "");

  if (normalized === "users" || normalized === `clients/${userId}`) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You are not allowed to upload to this location",
  });
};

export const uploadsRouter = createTRPCRouter({
  presign: authenticatedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
        contentLength: z.number().int().positive().max(MAX_FILE_SIZE),
        path: z.string().optional(),
        naming: z.enum(["filename", "uuid", "uuid-filename"]).optional(),
        overwrite: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Admins run the media library, which is a general-purpose bucket
      // browser — they may write any type anywhere. Everyone else is fenced in.
      if (ctx.session.user.role !== "admin") {
        if (!ALLOWED_CONTENT_TYPES.includes(input.contentType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File type ${input.contentType} is not allowed`,
          });
        }

        assertPathAllowed(input.path, ctx.session.user.id);
      }

      return presignUpload(input);
    }),

  list: adminProcedure
    .input(
      z.object({
        prefix: z.string().optional(),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => listObjects(input)),

  delete: adminProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await deleteObject(input.key);
      return { success: true };
    }),
});

import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import z from "zod";

import {
  adminProcedure,
  baseProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";

import { r2, R2_BUCKET, R2_PUBLIC_URL } from "../../lib/r2";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SIGNED_URL_EXPIRY = 60 * 5; // 5 minutes

export const ALLOWED_FOLDERS = ["users", "clients"] as const;

export const uploadRouter = createTRPCRouter({
  getUploadUrl: baseProcedure
    .input(
      z.object({
        key: z.string().min(1),
        folder: z.enum(ALLOWED_FOLDERS).optional(),
        contentType: z.string().refine((v) => ALLOWED_TYPES.includes(v), {
          message: "File type not allowed",
        }),
        size: z.number().max(MAX_FILE_SIZE, "File too large"),
      })
    )
    .mutation(async ({ input }) => {
      const key = input.folder ? `${input.folder}/${input.key}` : input.key;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: input.contentType,
        ContentLength: input.size,
      });

      const signedUrl = await getSignedUrl(r2, command, {
        expiresIn: SIGNED_URL_EXPIRY,
      });

      return {
        signedUrl,
        key,
        publicUrl: `${R2_PUBLIC_URL}/${key}`,
      };
    }),

  delete: baseProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: input.key,
        })
      );
      return { success: true };
    }),

  listFiles: adminProcedure
    .input(
      z.object({
        prefix: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const command = new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          Prefix: input.prefix,
        });

        const response = await r2.send(command);

        return (response.Contents ?? [])
          .filter((obj) => obj.Key)
          .map((obj) => ({
            key: obj.Key!,
            size: obj.Size ?? 0,
            lastModified: obj.LastModified?.toISOString() ?? null,
            publicUrl: `${R2_PUBLIC_URL}/${obj.Key}`,
          }));
      } catch (err) {
        console.error("Failed to list files:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list files from storage",
        });
      }
    }),
});

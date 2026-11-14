import z from "zod";

import { adminProcedure, createTRPCRouter } from "../init";
import {
  addImage,
  addImageFromUrl,
  createFolder,
  createPrompt,
  deleteFolder,
  deleteImage,
  deletePrompt,
  listLibrary,
  listPrompts,
  updatePrompt,
} from "../lib/inspiration";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "../lib/inspiration-shared";

// Admin only: the design inspiration board (hub /inspirations), stored in the
// media bucket under inspiration/. Replaces the old apps/inspiration.

const folderPath = z.string().max(400);
const promptFields = {
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
};

export const inspirationRouter = createTRPCRouter({
  library: adminProcedure.query(() => listLibrary()),

  createFolder: adminProcedure
    .input(z.object({ parent: folderPath, title: z.string().trim().min(1).max(80) }))
    .mutation(({ input }) => createFolder(input.parent, input.title)),

  deleteFolder: adminProcedure
    .input(z.object({ path: folderPath }))
    .mutation(({ input }) => deleteFolder(input.path)),

  // base64 body: inspiration shots are small, and it skips bucket CORS.
  addImage: adminProcedure
    .input(
      z.object({
        folder: folderPath,
        type: z.enum(Object.keys(IMAGE_TYPES) as [string, ...string[]]),
        data: z.string().max(Math.ceil((IMAGE_MAX_BYTES * 4) / 3) + 4),
      })
    )
    .mutation(({ input }) =>
      addImage(input.folder, new Uint8Array(Buffer.from(input.data, "base64")), input.type)
    ),

  addImageFromUrl: adminProcedure
    .input(z.object({ folder: folderPath, url: z.string().trim().max(2000) }))
    .mutation(({ input }) => addImageFromUrl(input.folder, input.url)),

  deleteImage: adminProcedure
    .input(z.object({ key: z.string().max(500) }))
    .mutation(({ input }) => deleteImage(input.key)),

  prompts: adminProcedure.query(() => listPrompts()),

  createPrompt: adminProcedure
    .input(z.object(promptFields))
    .mutation(({ input }) => createPrompt(input)),

  updatePrompt: adminProcedure
    .input(z.object({ id: z.string().max(120), ...promptFields }))
    .mutation(({ input }) => updatePrompt(input)),

  deletePrompt: adminProcedure
    .input(z.object({ id: z.string().max(120) }))
    .mutation(({ input }) => deletePrompt(input.id)),
});

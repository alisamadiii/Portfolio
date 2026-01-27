import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import z from "zod";

export const docs = defineDocs({
  dir: "content",
  docs: {
    schema: z.object({
      title: z.string(),
      description: z.string(),
      date: z.date(),
      thumbnail: z.string().optional(),
    }),
  },
});

export default defineConfig({});

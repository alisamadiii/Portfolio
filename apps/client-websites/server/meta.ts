import { z } from "zod";

// Shape of <slug>/_meta.json, written by the Claude Design upload skill.
// Only `name` is required. `business` field names follow the lead shape in
// packages/drizzle/src/schema/leads.ts so leads data drops in unchanged.
export const metaSchema = z.object({
  version: z.number().optional(),
  name: z.string().min(1),
  uploadedAt: z.string().optional(),
  design: z
    .object({
      chatUrl: z.string().optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  business: z
    .object({
      placeId: z.string().optional(),
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      mapsUrl: z.string().optional(),
      category: z.string().optional(),
      hours: z.array(z.string()).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
});

export type Meta = z.infer<typeof metaSchema>;

export type Project = {
  slug: string;
  meta: Meta | null;
  // "invalid" = _meta.json exists but is not valid JSON / fails the schema
  metaStatus: "ok" | "missing" | "invalid";
  updatedAt: string | null;
};

// A project's walkthrough deck always lives at <slug>/presentation.html.
export const PRESENTATION_FILE = "presentation.html";

export type ProjectDetail = Project & {
  // site .html files relative to the project folder, index.html first
  pages: string[];
  hasPresentation: boolean;
};

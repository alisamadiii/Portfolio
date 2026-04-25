import { z } from "zod";

import type { ProjectType } from "@workspace/drizzle/schema";

export type AgencyMetadata = {
  userId?: string;
  email?: string;
  services?: string;
  project?: ProjectType;
};

export const AgencyServiceSchema = z.object({
  name: z.string(),
  price: z.number(),
});

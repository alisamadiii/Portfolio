import type { Context } from "hono";
import type { z } from "zod";

import { ApiError } from "./errors.js";

// Parse + validate a JSON body. Errors come back as one readable line per
// field ("contentLength: must be <= 52428800"), never a raw zod dump.
export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T
): Promise<z.infer<T>> {
  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => {
      const path = i.path.join(".") || "body";
      return `${path}: ${i.message}`;
    });
    throw new ApiError(
      400,
      "VALIDATION_FAILED",
      lines.join("; "),
      "One or more body fields are missing or malformed. Each item above is `field: problem`."
    );
  }
  return parsed.data;
}

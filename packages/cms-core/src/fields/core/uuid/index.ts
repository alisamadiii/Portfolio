import { z } from "zod";

import { Field } from "../../../types/field";

const defaultValue = (): string => {
  return crypto.randomUUID();
};

const schema = (field: Field, configObject?: Record<string, any>) => {
  let zodSchema: z.ZodTypeAny = z.string().uuid("Invalid UUID format");

  if (!field.required) zodSchema = zodSchema.optional().nullable();

  return zodSchema;
};

const label = "UUID";

export { label, defaultValue, schema };

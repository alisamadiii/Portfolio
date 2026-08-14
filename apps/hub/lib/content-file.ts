import { writeFns } from "@/fields/registry";

import { createHttpError } from "@/lib/api-error";
import { isContentOperationAllowed } from "@/lib/operations";
import {
  deepMap,
  generateZodSchema,
  getSchemaByName,
  sanitizeObject,
} from "@/lib/schema";
import { stringify } from "@/lib/serialization";
import {
  getFileExtension,
  getFileName,
  getParentPath,
  serializedTypes,
} from "@/lib/utils/file";

/**
 * Shared validation + serialization for content entries, used by both the
 * single-file save route (files/[path]) and the batch publish route.
 */

type ValidatedContentEntry = {
  schema: Record<string, any>;
} & (
  | { mode: "serialized"; contentObject: any }
  | { mode: "body"; body: string }
  | { mode: "gitkeep" }
);

export function validateContentEntry({
  config,
  name,
  path,
  content,
  isCreate,
}: {
  config: Record<string, any> | null;
  name: string;
  path: string;
  content: any;
  isCreate: boolean;
}): ValidatedContentEntry {
  if (!name) throw new Error(`"name" is required for content.`);

  const schema = getSchemaByName(config?.object, name);
  if (!schema) throw new Error(`Content schema not found for ${name}.`);
  if (isCreate && !isContentOperationAllowed("create", { schema })) {
    throw createHttpError(`Creating entries isn't allowed for "${name}".`, 403);
  }

  if (!path.startsWith(schema.path))
    throw new Error(`Invalid path "${path}" for content "${name}".`);

  if (schema.subfolders === false && getParentPath(path) !== schema.path) {
    throw new Error(`Subfolders are not allowed for collection "${name}".`);
  }

  if (getFileName(path) === ".gitkeep") {
    // Folder creation
    return { schema, mode: "gitkeep" };
  }

  if (getFileExtension(path) !== (schema.extension ?? ""))
    throw new Error(
      `Invalid extension "${getFileExtension(path)}" for content "${name}".`
    );

  if (!serializedTypes.includes(schema.format) || !schema.fields) {
    return { schema, mode: "body", body: content?.body ?? "" };
  }

  // Wrapping things in listWrapper to deal with lists at the root
  let contentFields;
  let contentObject;
  if (schema.list) {
    contentObject = { listWrapper: content };
    contentFields = [
      {
        name: "listWrapper",
        type: "object",
        list: true,
        fields: schema.fields,
      },
    ];
  } else {
    contentObject = content;
    contentFields = schema.fields;
  }

  const zodSchema = generateZodSchema(contentFields);
  const zodValidation = zodSchema.safeParse(contentObject);

  if (zodValidation.success === false) {
    const errorMessages = zodValidation.error.errors.map((error: any) => {
      let message = error.message;
      if (error.path.length > 0)
        message = `${message} at ${error.path.join(".")}`;
      return message;
    });
    throw new Error(`Content validation failed: ${errorMessages.join(", ")}`);
  }

  const validatedContentObject = deepMap(
    zodValidation.data,
    contentFields,
    (value, field) => {
      const fieldType = field.type as string;
      return writeFns[fieldType]
        ? writeFns[fieldType](value, field, config || {})
        : value;
    }
  );

  const unwrappedContentObject = schema.list
    ? validatedContentObject.listWrapper
    : validatedContentObject;

  return {
    schema,
    mode: "serialized",
    contentObject: JSON.parse(JSON.stringify(unwrappedContentObject)),
  };
}

export function stringifyContentEntry(
  schema: Record<string, any>,
  contentObject: any
): string {
  return stringify(sanitizeObject(contentObject), {
    format: schema.format,
    delimiters: schema.delimiters,
  });
}

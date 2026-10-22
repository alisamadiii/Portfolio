/**
 * Helper functions for the CMS field schema.
 */

import { defaultValues } from "./fields/registry";
import slugify from "slugify";

import { Field } from "./types/field";

type SchemaGroupTrailItem = {
  name: string;
  label?: string;
};

type NavigationNode = {
  type: "group" | "file" | "collection" | "media";
  name: string;
  label?: string;
  items?: NavigationNode[];
};

// Deep map a content object to a schema
const deepMap = (
  contentObject: Record<string, any>,
  fields: Field[],
  apply: (value: any, field: Field) => any
): Record<string, any> => {
  const traverse = (data: any, schema: Field[]): any => {
    const result: any = {};
    const currentData = data || {}; // Ensure data is an object

    schema.forEach((field) => {
      const value = currentData[field.name];

      if (field.list) {
        if (value === undefined) {
          result[field.name] = apply(value, field);
        } else {
          result[field.name] = Array.isArray(value)
            ? value.map((item) => {
                if (field.type === "object") {
                  return traverse(item, field.fields || []);
                } else if (field.type === "block") {
                  const blockKey = field.blockKey || "_block";
                  const blockName = item?.[blockKey];
                  const blockDef = field.blocks?.find(
                    (b) => b.name === blockName
                  );
                  if (blockDef) {
                    const innerResult = traverse(item, blockDef.fields || []);
                    // Merge discriminator back after processing inner fields
                    return { [blockKey]: blockName, ...innerResult };
                  }
                  return item;
                } else {
                  return apply(item, field);
                }
              })
            : [];
        }
      } else if (field.type === "object") {
        result[field.name] = traverse(value, field.fields || []);
      } else if (field.type === "block") {
        const blockKey = field.blockKey || "_block";
        const blockName = value?.[blockKey];
        const blockDef = field.blocks?.find((b) => b.name === blockName);
        if (blockDef && value) {
          const innerResult = traverse(value, blockDef.fields || []);
          // Merge discriminator back after processing inner fields
          result[field.name] = { [blockKey]: blockName, ...innerResult };
        } else {
          result[field.name] = value;
        }
      } else {
        result[field.name] = apply(value, field);
      }
    });

    return result;
  };

  return traverse(contentObject, fields);
};

// Create an initial state for an entry based on the schema fields and content
const initializeState = (
  fields: Field[] | undefined,
  contentObject: Record<string, any> = {}
): Record<string, any> => {
  if (!fields) return {};

  // Ensure deepMap gets a valid object even if contentObject is null/undefined
  const sanitizedContent = contentObject || {};

  return deepMap(sanitizedContent, fields, (value, field) => {
    let appliedValue = value;
    if (value === undefined) {
      appliedValue = field.list
        ? typeof field.list === "object" && field.list.default !== undefined
          ? field.list.default
          : []
        : getDefaultValue(field);
    }
    // Handle potential null values passed from traverse if the object didn't exist
    else if (appliedValue === null && field.type !== "object" && !field.list) {
      appliedValue = getDefaultValue(field);
    }
    return appliedValue;
  });
};

// Get the default value for a field
const getDefaultValue = (field: Record<string, any>) => {
  if (field.default !== undefined) {
    return field.default;
  } else if (field.type === "object") {
    return initializeState(field.fields, {});
  } else if (field.type === "block") {
    return null;
  } else {
    const defaultValue = defaultValues?.[field.type];
    return defaultValue instanceof Function
      ? defaultValue(field)
      : defaultValue !== undefined
        ? defaultValue
        : "";
  }
};

// Treat optional object fields as absent when all nested values are empty.
const isEffectivelyEmpty = (value: unknown): boolean => {
  if (value == null || value === "") return true;

  if (Array.isArray(value)) {
    return (
      value.length === 0 || value.every((item) => isEffectivelyEmpty(item))
    );
  }

  if (value instanceof Date) return false;

  if (typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    return (
      entries.length === 0 || entries.every((item) => isEffectivelyEmpty(item))
    );
  }

  // Booleans and numbers are meaningful values (`false`/`0` included).
  return false;
};

// Traverse the object and remove all empty/null/undefined values
const sanitizeObject = (object: any): any => {
  const isEmpty = (val: any) => val == null || val === "";

  if (Array.isArray(object)) {
    return object
      .map((val) =>
        val && typeof val === "object" && !(val instanceof Date)
          ? sanitizeObject(val)
          : val
      )
      .filter((val) => !isEmpty(val));
  }

  if (object && typeof object === "object" && !(object instanceof Date)) {
    const objectCopy = { ...object };

    Object.keys(objectCopy).forEach((key) => {
      const val = objectCopy[key];

      if (val && typeof val === "object" && !(val instanceof Date)) {
        objectCopy[key] = sanitizeObject(val);
      }

      if (
        (Array.isArray(objectCopy[key]) && objectCopy[key].every(isEmpty)) ||
        (typeof objectCopy[key] === "object" &&
          !Array.isArray(objectCopy[key]) &&
          !(objectCopy[key] instanceof Date) &&
          objectCopy[key] != null &&
          !Object.keys(objectCopy[key]).length) ||
        isEmpty(objectCopy[key])
      ) {
        delete objectCopy[key];
      }
    });

    return objectCopy;
  }

  return object;
};

const getSchemaGroupTrail = (
  config: Record<string, any> | null | undefined,
  name: string
): SchemaGroupTrailItem[] => {
  const navigation = config?.navigation?.content as
    | NavigationNode[]
    | undefined;
  if (!navigation?.length || !name) return [];

  const visit = (
    nodes: NavigationNode[],
    parents: SchemaGroupTrailItem[]
  ): SchemaGroupTrailItem[] | null => {
    for (const node of nodes) {
      if (node.type === "group") {
        const match = visit(node.items || [], [
          ...parents,
          { name: node.name, label: node.label || node.name },
        ]);
        if (match) return match;
        continue;
      }

      if (node.name === name) {
        return parents;
      }
    }

    return null;
  };

  return visit(navigation, []) || [];
};

// Retrieve the matching schema for a media or content entry
const getSchemaByName = (
  config: Record<string, any> | null | undefined,
  name: string,
  type: string = "content"
) => {
  if (
    !config ||
    (type === "media" && !config.media) ||
    (type === "content" && !config.content) ||
    !name
  )
    return null;

  const schema =
    type === "media"
      ? config.media.find((item: Record<string, any>) => item.name === name)
      : config.content.find((item: Record<string, any>) => item.name === name);

  // We deep clone the object to avoid mutating config if schema is modified.
  if (!schema) return null;

  const clonedSchema = JSON.parse(JSON.stringify(schema));
  if (type === "content") {
    clonedSchema.groupTrail = getSchemaGroupTrail(config, name);
  }
  return clonedSchema;
};

// Get a field by its path
function getFieldByPath(schema: Field[], path: string): Field | undefined {
  const [first, ...rest] = path.split(".");
  const field = schema.find((f) => f.name === first);

  return !field
    ? undefined
    : rest.length === 0
      ? field
      : field.type === "object" && field.fields
        ? getFieldByPath(field.fields, rest.join("."))
        : undefined;
}

function findNestedFieldPath(
  fields: Field[] | undefined,
  matcher: (field: Field) => boolean,
  prefix?: string
): string | undefined {
  if (!fields?.length) return undefined;

  for (const field of fields) {
    const path = prefix ? `${prefix}.${field.name}` : field.name;

    if (matcher(field)) {
      return path;
    }

    if (field.type === "object" && field.fields) {
      const nestedMatch = findNestedFieldPath(field.fields, matcher, path);
      if (nestedMatch) return nestedMatch;
    }
  }

  return undefined;
}

export {
  deepMap,
  initializeState,
  getDefaultValue,
  sanitizeObject,
  getSchemaByName,
  getFieldByPath,
};

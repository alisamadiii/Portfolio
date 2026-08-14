import * as booleanField from "./core/boolean";
import * as codeField from "./core/code";
import * as dateField from "./core/date";
import * as fileField from "./core/file";
import * as imageField from "./core/image";
import * as numberField from "./core/number";
import * as referenceField from "./core/reference";
import * as richTextField from "./core/rich-text";
import * as selectField from "./core/select";
import * as stringField from "./core/string";
import * as textField from "./core/text";
import * as uuidField from "./core/uuid";
import { z } from "zod";

import { Field } from "../types/field";

type FieldModule = {
  label?: string;
  schema?: (...args: any[]) => z.ZodTypeAny;
  defaultValue?: any;
  read?: (...args: any[]) => any;
  write?: (...args: any[]) => any;
};

const fieldTypes = new Set<string>();
const labels: Record<string, string> = {};
const schemas: Record<
  string,
  (field: Field, configObject?: Record<string, any>) => z.ZodTypeAny
> = {};
const defaultValues: Record<string, any> = {};
const readFns: Record<
  string,
  (value: any, field: Field, configObject?: Record<string, any>) => void
> = {};
const writeFns: Record<
  string,
  (value: any, field: Field, configObject?: Record<string, any>) => void
> = {};

const registerField = (fieldName: string, fieldModule: FieldModule) => {
  fieldTypes.add(fieldName);

  if (fieldModule.label) labels[fieldName] = fieldModule.label;
  if (fieldModule.schema) schemas[fieldName] = fieldModule.schema;
  if (fieldModule.defaultValue !== undefined)
    defaultValues[fieldName] = fieldModule.defaultValue;
  if (fieldModule.read) readFns[fieldName] = fieldModule.read;
  if (fieldModule.write) writeFns[fieldName] = fieldModule.write;
};

registerField("boolean", booleanField);
registerField("code", codeField);
registerField("date", dateField);
registerField("file", fileField);
registerField("image", imageField);
registerField("number", numberField);
registerField("reference", referenceField);
registerField("rich-text", richTextField);
registerField("select", selectField);
registerField("string", stringField);
registerField("text", textField);
registerField("uuid", uuidField);

export { labels, schemas, readFns, writeFns, defaultValues, fieldTypes };

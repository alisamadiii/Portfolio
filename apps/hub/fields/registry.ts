/**
 * Field component registry (hub-only).
 *
 * Maps field type -> React Edit/View components. The pure field logic
 * (schemas, read/write transforms, default values, labels) lives in
 * `@workspace/cms-core/fields/registry` so the server engine can import it
 * without dragging in any UI code. This file is only imported from hub
 * client components.
 */

import { EditComponent as BooleanEdit } from "./core/boolean/edit-component";
import { ViewComponent as BooleanView } from "./core/boolean/view-component";
import { EditComponent as CodeEdit } from "./core/code/lazy-edit-component";
import { EditComponent as DateEdit } from "./core/date/edit-component";
import { ViewComponent as DateView } from "./core/date/view-component";
import { EditComponent as FileEdit } from "./core/file/edit-component";
import { ViewComponent as FileView } from "./core/file/view-component";
import { EditComponent as ImageEdit } from "./core/image/edit-component";
import { ViewComponent as ImageView } from "./core/image/view-component";
import { EditComponent as NumberEdit } from "./core/number/edit-component";
import { EditComponent as ReferenceEdit } from "./core/reference/edit-component";
import { ViewComponent as ReferenceView } from "./core/reference/view-component";
import { EditComponent as RichTextEdit } from "./core/rich-text/lazy-edit-component";
import { ViewComponent as RichTextView } from "./core/rich-text/view-component";
import { EditComponent as SelectEdit } from "./core/select/edit-component";
import { EditComponent as StringEdit } from "./core/string/edit-component";
import { EditComponent as TextEdit } from "./core/text/edit-component";
import { EditComponent as UuidEdit } from "./core/uuid/edit-component";

const editComponents: Record<string, React.ComponentType<any>> = {
  boolean: BooleanEdit,
  code: CodeEdit,
  date: DateEdit,
  file: FileEdit,
  image: ImageEdit,
  number: NumberEdit,
  reference: ReferenceEdit,
  "rich-text": RichTextEdit,
  select: SelectEdit,
  string: StringEdit,
  text: TextEdit,
  uuid: UuidEdit,
};

const viewComponents: Record<string, React.ComponentType<any>> = {
  boolean: BooleanView,
  date: DateView,
  file: FileView,
  image: ImageView,
  reference: ReferenceView,
  "rich-text": RichTextView,
};

export { editComponents, viewComponents };

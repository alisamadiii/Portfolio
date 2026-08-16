/**
 * postMessage protocol between the CMS (parent window) and a client site
 * running the bridge (iframe). Every v2 message carries the envelope
 * `{ cms: 1, v: 2, type: ... }`; receivers ignore anything without `cms: 1`.
 *
 * Legacy v1 messages (`cms-preview-ready`, `cms-field-focus`) are still sent
 * and accepted on both sides so old deployed bridges and old CMS builds keep
 * working against each other.
 */

export const PROTOCOL_VERSION = 2;

export type BridgeMode = "highlight" | "edit";

/**
 * Capabilities the bridge declares in `ready`. v1 bridges only do "text";
 * v3 adds "media" (click an image → CMS media picker) and "link" (edit an
 * anchor's href).
 */
export type BridgeCapability = "text" | "media" | "link" | "group";

// ---------------------------------------------------------------------------
// Bridge → CMS
// ---------------------------------------------------------------------------

export interface ReadyMessage {
  cms: 1;
  v: number;
  type: "ready";
  /** Full location.href of the page inside the iframe. */
  url: string;
  /** location.pathname — the canvas keys frames by this. */
  path: string;
  mode: BridgeMode;
  /** Unique `data-cms-field` values present in the DOM. */
  fields: string[];
  caps: BridgeCapability[];
}

export interface FieldInputMessage {
  cms: 1;
  v: number;
  type: "field-input";
  path: string;
  value: string;
}

export interface FieldCommitMessage {
  cms: 1;
  v: number;
  type: "field-commit";
  path: string;
  value: string;
}

export interface FieldFocusMessage {
  cms: 1;
  v: number;
  type: "field-focus";
  path: string;
}

/** A single field inside a `group` activation: its path and how the CMS edits it. */
export interface GroupMember {
  path: string;
  kind: "text" | "media" | "link";
}

/**
 * A non-text field was activated in edit mode — the CMS opens the matching
 * editor (media picker for images, URL popover for links) rather than editing
 * inline. `value` is the element's current src/href so the editor can seed it.
 *
 * `kind: "group"` is a NON-LEAF tagged element (e.g. a heading that wraps a
 * tagged highlight span): it can't be contenteditable, so the CMS opens a
 * popover editing the host field plus every tagged descendant. `members`
 * carries the cluster (host first) and `rect` the host's on-screen box so the
 * CMS can anchor the popover. `value` is unused for groups.
 */
export interface FieldActivateMessage {
  cms: 1;
  v: number;
  type: "field-activate";
  path: string;
  kind: "media" | "link" | "group";
  value?: string;
  /** Present only for `kind: "group"` — the host field and its tagged descendants. */
  members?: GroupMember[];
  /** Present only for `kind: "group"` — host `getBoundingClientRect` (iframe px). */
  rect?: { x: number; y: number; width: number; height: number };
}

/**
 * A link was clicked in edit mode — the bridge blocks navigation (the iframe
 * must never change pages) and the CMS shows a small popover with the link's
 * destination, anchored via `rect` (the anchor's box in iframe px).
 */
export interface LinkInfoMessage {
  cms: 1;
  v: number;
  type: "link-info";
  href: string;
  rect: { x: number; y: number; width: number; height: number };
}

export type BridgeToCmsMessage =
  | ReadyMessage
  | FieldInputMessage
  | FieldCommitMessage
  | FieldFocusMessage
  | FieldActivateMessage
  | LinkInfoMessage;

// ---------------------------------------------------------------------------
// CMS → Bridge
// ---------------------------------------------------------------------------

export interface FocusMessage {
  cms: 1;
  v: number;
  type: "focus";
  path: string;
}

export interface SetMessage {
  cms: 1;
  v: number;
  type: "set";
  values: Array<{ path: string; value: string }>;
}

export interface ModeMessage {
  cms: 1;
  v: number;
  type: "mode";
  mode: BridgeMode;
}

/**
 * The CMS's whitelist of which tagged fields are actually editable, by kind.
 * A `data-cms-field` absent from all three lists resolves to no CMS field and
 * is left inert (not armed, no error). Sent after `ready`; until it arrives the
 * bridge arms every tagged leaf (back-compat with CMS builds that never send it).
 */
export interface EditableMessage {
  cms: 1;
  v: number;
  type: "editable";
  /** Paths editable as inline text (string/text/number and other form fields). */
  arm: string[];
  /** Image paths — click opens the media picker. */
  media: string[];
  /** Link paths — the href is editable via a URL popover. */
  link: string[];
}

export type CmsToBridgeMessage =
  | FocusMessage
  | SetMessage
  | ModeMessage
  | EditableMessage;

// ---------------------------------------------------------------------------
// Legacy (v1) shapes
// ---------------------------------------------------------------------------

export interface LegacyReadyMessage {
  type: "cms-preview-ready";
}

export interface LegacyFieldFocusMessage {
  type: "cms-field-focus";
  field: string;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function isBridgeEnvelope(
  data: unknown
): data is { cms: 1; v: number; type: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { cms?: unknown }).cms === 1 &&
    typeof (data as { type?: unknown }).type === "string"
  );
}

export function envelope<T extends { type: string }>(
  msg: T
): T & { cms: 1; v: number } {
  return { cms: 1, v: PROTOCOL_VERSION, ...msg };
}

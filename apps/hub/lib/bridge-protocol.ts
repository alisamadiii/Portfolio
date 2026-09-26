/**
 * postMessage protocol between the CMS (parent window) and a client site
 * running the bridge (iframe). Formerly `@alisamadiillc/cms-bridge`; that
 * package is now a build-time source annotator and no longer ships this
 * protocol, so the hub keeps its own copy — deployed bridges still speak
 * these shapes over postMessage at runtime.
 *
 * Every v2 message carries the envelope
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
export type BridgeCapability =
  | "text"
  | "media"
  | "link"
  | "group"
  | "group-ops"
  | "variant"
  | "blog";

// ---------------------------------------------------------------------------
// Bridge → CMS
// ---------------------------------------------------------------------------

/**
 * A tagged field with its editor kind, as declared in the DOM. `kind` comes
 * from the explicit `data-cms-kind` attribute (bridge components) or, absent
 * that, is inferred from the element (IMG → media, A → link, else text).
 */
export interface FieldInfo {
  path: string;
  kind: "text" | "media" | "link" | "group";
  /** True when the element carried an explicit `data-cms-kind` attribute. */
  declared: boolean;
}

/** A `<Group>` host and how many `data-cms-item` children it rendered. */
export interface GroupInfo {
  path: string;
  count: number;
}

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
  /**
   * CMS v2: every tagged field with its kind. A v2 CMS uses this instead of
   * sending back an `editable` whitelist — the DOM is the source of truth.
   */
  fieldsV2?: FieldInfo[];
  /**
   * CMS v2: rendered `<Group>` hosts and their item counts, so the CMS can
   * reconcile structural draft changes (added/removed items) against the
   * committed HTML the iframe rendered.
   */
  groups?: GroupInfo[];
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

/**
 * CMS v2 structural edit request from a `<Group>`'s edit controls. The bridge
 * never mutates the DOM on its own — the CMS is authoritative: it splices the
 * draft array and answers with `group-apply`, which the bridge then applies
 * (cloneNode for add, remove, reinsert for move) before reindexing paths.
 */
export interface GroupOpMessage {
  cms: 1;
  v: number;
  type: "group-op";
  /** The group host's field path (the array). */
  path: string;
  op: "add" | "remove" | "move";
  index: number;
  /** Target index — present only for `op: "move"`. */
  toIndex?: number;
}

/**
 * A collection region (`<Collection name>`) was clicked. The hub opens that
 * collection's editor (the in-canvas CMS overlay). No inline editing — unlike
 * a group, the entries live on a dedicated collection page.
 */
export interface CollectionOpenMessage {
  cms: 1;
  v: number;
  type: "collection-open";
  /** The collection name (`data-cms-collection`), matched against cms.json. */
  collection: string;
}

/**
 * A variant region (any component's `variant` prop) was clicked in edit mode.
 * The hub opens that variant. `variant` is the declared name, or `""` when the
 * prop was a boolean flag (`variant` with no value).
 */
export interface VariantOpenMessage {
  cms: 1;
  v: number;
  type: "variant-open";
  variant: string;
}

/**
 * A blog region (`<Region type="blog">`) was clicked in edit mode. The hub opens
 * the Blog settings page.
 */
export interface BlogOpenMessage {
  cms: 1;
  v: number;
  type: "blog-open";
}

/**
 * The overlay successfully created an AI-edit request (element popover or the
 * page-level chat). The hub refreshes its jobs list immediately instead of
 * waiting for the next poll.
 */
export interface EditSubmittedMessage {
  cms: 1;
  v: number;
  type: "edit-submitted";
  /** content-pilot job id, when the intake returned one. */
  jobId?: number;
}

/**
 * The AI-analyzer preview overlay reported a clicked element. Preview sessions
 * only — the analyzer replaces cms-bridge in the dev-server build. The hub
 * attaches this element's source ref + text + page to the next AI chat message
 * so the AI edits the right file without scanning the repo. No write happens.
 */
export interface ElementPickMessage {
  cms: 1;
  v: number;
  type: "element-pick";
  /** `<project?>:src/…/File.astro:LINE` from data-cms-src (may be ""). */
  sourceRef: string;
  /** Human-readable label of the element (text, or `image src/alt`). */
  elementText: string;
  /** Full URL of the previewed page. */
  pageUrl: string;
  /** Route path of the previewed page. */
  pagePath: string;
}

/**
 * The AI-analyzer preview overlay reports every page load inside the preview
 * iframe (sent on init, active or not) so the hub's page tree can follow
 * in-frame navigation.
 */
export interface PreviewNavigateMessage {
  cms: 1;
  v: number;
  type: "preview-navigate";
  /** Route path of the page the frame is now on. */
  pagePath: string;
  /** Full URL of the page the frame is now on. */
  pageUrl: string;
}

export type BridgeToCmsMessage =
  | ReadyMessage
  | FieldInputMessage
  | FieldCommitMessage
  | FieldFocusMessage
  | FieldActivateMessage
  | LinkInfoMessage
  | GroupOpMessage
  | CollectionOpenMessage
  | VariantOpenMessage
  | BlogOpenMessage
  | EditSubmittedMessage
  | ElementPickMessage
  | PreviewNavigateMessage;

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

/**
 * CMS v2 answer to `group-op` (or an unsolicited structural reconcile on
 * frame load, when a draft's array length differs from the rendered count).
 * On `ok: true` the bridge mutates the DOM and reindexes; on `ok: false` it
 * does nothing (no optimistic mutation to revert). `values` carries the
 * flattened field values of the whole array after the splice, applied through
 * the normal `set` path once the DOM matches.
 */
export interface GroupApplyMessage {
  cms: 1;
  v: number;
  type: "group-apply";
  ok: boolean;
  path: string;
  op: "add" | "remove" | "move";
  index: number;
  toIndex?: number;
  values?: Array<{ path: string; value: string }>;
}

export type CmsToBridgeMessage =
  | FocusMessage
  | SetMessage
  | ModeMessage
  | EditableMessage
  | GroupApplyMessage;

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

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

/** Capabilities the bridge declares in `ready`. v1 bridges only do "text". */
export type BridgeCapability = "text";

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

export type BridgeToCmsMessage =
  | ReadyMessage
  | FieldInputMessage
  | FieldCommitMessage
  | FieldFocusMessage;

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

export type CmsToBridgeMessage = FocusMessage | SetMessage | ModeMessage;

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

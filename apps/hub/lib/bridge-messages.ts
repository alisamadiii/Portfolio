/**
 * Thin wrappers over the cms-bridge postMessage protocol. Normalizes legacy
 * v1 messages (old deployed bridge scripts) into the v2 shapes so consumers
 * handle one format.
 */

import {
  envelope,
  isBridgeEnvelope,
  type BridgeToCmsMessage,
  type ReadyMessage,
} from "@alisamadiillc/cms-bridge";

export type {
  BridgeToCmsMessage,
  CmsToBridgeMessage,
  ReadyMessage,
  FieldCommitMessage,
  FieldInputMessage,
  FieldActivateMessage,
  GroupInfo,
  GroupMember,
  GroupOpMessage,
  LinkInfoMessage,
  VariantOpenMessage,
  BlogOpenMessage,
} from "@alisamadiillc/cms-bridge";

/**
 * Parse a `message` event coming from a bridge iframe. Returns `null` for
 * wrong-origin or non-bridge messages. Legacy `cms-preview-ready` is
 * normalized to a v1 `ready` (empty `fields` — old bridges don't report them).
 *
 * NOTE: with several same-origin iframes the origin check is not enough to
 * identify the frame — always pair with an `event.source` → frame lookup.
 */
export function parseBridgeMessage(
  event: MessageEvent,
  expectedOrigin: string
): BridgeToCmsMessage | null {
  if (event.origin !== expectedOrigin) return null;
  const data = event.data as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "cms-preview-ready"
  ) {
    const legacy: ReadyMessage = {
      cms: 1,
      v: 1,
      type: "ready",
      url: "",
      path: "",
      mode: "highlight",
      fields: [],
      caps: [],
    };
    return legacy;
  }
  if (!isBridgeEnvelope(data)) return null;
  return data as BridgeToCmsMessage;
}

export function postToFrame(
  win: Window | null | undefined,
  origin: string,
  msg: { type: string } & Record<string, unknown>
): void {
  win?.postMessage(envelope(msg), origin);
}

/** Send a field-focus in both v2 and legacy formats (old bridges only know v1). */
export function postFocus(
  win: Window | null | undefined,
  origin: string,
  path: string
): void {
  win?.postMessage({ type: "cms-field-focus", field: path }, origin);
  postToFrame(win, origin, { type: "focus", path });
}

/** Push values into a page (updates every matching element except the caret host). */
export function postSet(
  win: Window | null | undefined,
  origin: string,
  values: Array<{ path: string; value: string }>
): void {
  if (values.length === 0) return;
  postToFrame(win, origin, { type: "set", values });
}

/** Tell a page which tagged fields are editable, and how (text / media / link). */
export function postEditable(
  win: Window | null | undefined,
  origin: string,
  editable: { arm: string[]; media: string[]; link: string[] }
): void {
  postToFrame(win, origin, { type: "editable", ...editable });
}

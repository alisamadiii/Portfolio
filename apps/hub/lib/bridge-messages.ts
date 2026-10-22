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
} from "./bridge-protocol";

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

function postToFrame(
  win: Window | null | undefined,
  origin: string,
  msg: { type: string } & Record<string, unknown>
): void {
  win?.postMessage(envelope(msg), origin);
}

/** Hide or restore the overlay's own floating launcher chrome. */
export function postChrome(
  win: Window | null | undefined,
  origin: string,
  launcher: "hidden" | "visible"
): void {
  postToFrame(win, origin, { type: "chrome", launcher });
}

/** Arm or disarm element picking in the preview overlay. */
export function postPickMode(
  win: Window | null | undefined,
  origin: string,
  active: boolean
): void {
  postToFrame(win, origin, { type: "pick-mode", active });
}

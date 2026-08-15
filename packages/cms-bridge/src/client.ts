/**
 * Browser bridge for client sites. Booted only when the page URL carries
 * `?cms-preview=…` (the CMS iframe adds it) or a previous boot in this tab
 * stored the mode in sessionStorage (Astro's ClientRouter drops the query
 * param on soft navigations).
 *
 * Modes:
 *  - "highlight" (`?cms-preview=1`) — read-only; scroll+highlight the element
 *    whose `data-cms-field` matches the field focused in the CMS form.
 *  - "edit" (`?cms-preview=edit`) — canvas mode; leaf `data-cms-field` text
 *    elements become contenteditable and edits are posted to the parent.
 *
 * The field path, the JSON key path, and the `data-cms-field` value are the
 */

import {
  envelope,
  isBridgeEnvelope,
  type BridgeMode,
  type CmsToBridgeMessage,
  type LegacyFieldFocusMessage,
} from "./protocol";

const PARAM = "cms-preview";
const MODE_KEY = "cms-bridge-mode";
const HIGHLIGHT_CLASS = "cms-preview-highlight";
const STYLE_ID = "cms-preview-style";
const FIELD_ATTR = "data-cms-field";
const EDITABLE_ATTR = "data-cms-editable";
const MEDIA_ATTR = "data-cms-media";
const LINK_ATTR = "data-cms-link";
const INPUT_THROTTLE_MS = 150;

/** Tags that never make sense as editable text hosts. */
const NON_TEXT_TAGS = new Set([
  "IMG",
  "PICTURE",
  "VIDEO",
  "AUDIO",
  "IFRAME",
  "SVG",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "SOURCE",
]);

/**
 * The CMS's editable whitelist (from the `editable` message). `null` until it
 * arrives — until then every tagged leaf is armed (back-compat with CMS builds
 * that never send it). Once set, a path in none of the sets stays inert.
 */
let editable: { arm: Set<string>; media: Set<string>; link: Set<string> } | null =
  null;

let booted = false;
let mode: BridgeMode = "highlight";
let current: Element | null = null;
let focusSnapshot: { el: HTMLElement; path: string; value: string } | null =
  null;
let inputTimer: ReturnType<typeof setTimeout> | null = null;

function post(msg: { type: string } & Record<string, unknown>): void {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(envelope(msg), "*");
  }
}

function esc(value: string): string {
  return window.CSS && CSS.escape ? CSS.escape(value) : value;
}

// ---------------------------------------------------------------------------
// Highlight (ported from the original public/cms-preview.js)
// ---------------------------------------------------------------------------

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent =
    `.${HIGHLIGHT_CLASS}{outline:2px solid #6366f1;outline-offset:3px;border-radius:2px;` +
    `animation:cms-preview-pulse 1.2s ease-out;}` +
    `@keyframes cms-preview-pulse{0%{box-shadow:0 0 0 0 rgba(99,102,241,.5);}` +
    `100%{box-shadow:0 0 0 14px rgba(99,102,241,0);}}` +
    `[${EDITABLE_ATTR}]:hover{outline:1px dashed rgba(99,102,241,.6);outline-offset:2px;cursor:text;}` +
    `[${EDITABLE_ATTR}]:focus{outline:2px solid #6366f1;outline-offset:2px;border-radius:2px;}` +
    `[${MEDIA_ATTR}]:hover{outline:2px dashed rgba(99,102,241,.7);outline-offset:2px;cursor:pointer;}` +
    `[${LINK_ATTR}]:hover{outline:1px dashed rgba(99,102,241,.5);outline-offset:3px;}`;
  document.head.appendChild(style);
}

function clearHighlight(): void {
  if (current) {
    current.classList.remove(HIGHLIGHT_CLASS);
    current = null;
  }
}

function resolve(field: string): Element | null {
  if (!field) return null;
  let el = document.querySelector(`[${FIELD_ATTR}="${esc(field)}"]`);
  if (el) return el;
  // Prefix fallback: focusing `hero.cta.link` highlights the `hero.cta` element.
  const parts = field.split(".");
  while (parts.length > 1) {
    parts.pop();
    el = document.querySelector(`[${FIELD_ATTR}="${esc(parts.join("."))}"]`);
    if (el) return el;
  }
  // Child fallback: focusing an object highlights its first tagged descendant.
  return document.querySelector(`[${FIELD_ATTR}^="${esc(field)}."]`);
}

function highlight(field: string): void {
  const el = resolve(field);
  clearHighlight();
  if (!el) return;
  injectStyle();
  el.classList.remove(HIGHLIGHT_CLASS);
  void (el as HTMLElement).offsetWidth; // reflow so the pulse restarts on re-focus
  el.classList.add(HIGHLIGHT_CLASS);
  current = el;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

function supportsPlaintextOnly(): boolean {
  const div = document.createElement("div");
  try {
    div.contentEditable = "plaintext-only";
  } catch {
    return false;
  }
  return div.contentEditable === "plaintext-only";
}

function isEditableCandidate(el: Element): boolean {
  if (NON_TEXT_TAGS.has(el.tagName)) return false;
  // Leaf only: no nested tagged fields, no media inside.
  if (el.querySelector(`[${FIELD_ATTR}]`)) return false;
  if (el.querySelector("img,picture,video,svg,iframe")) return false;
  return true;
}

type FieldKind = "text" | "media" | "link" | "none";

/** What editor a tagged path gets. Without a whitelist, everything is text. */
function kindForPath(path: string): FieldKind {
  if (!editable) return "text";
  if (editable.media.has(path)) return "media";
  if (editable.link.has(path)) return "link";
  if (editable.arm.has(path)) return "text";
  return "none";
}

function armTextEditable(host: HTMLElement, plaintext: boolean): void {
  if (host.hasAttribute(EDITABLE_ATTR)) return;
  host.setAttribute(EDITABLE_ATTR, "");
  host.setAttribute("contenteditable", plaintext ? "plaintext-only" : "true");
  host.setAttribute("spellcheck", "false");
}

function armEditables(): void {
  const plaintext = supportsPlaintextOnly();
  const nodes = document.querySelectorAll(`[${FIELD_ATTR}]`);
  for (const el of Array.from(nodes)) {
    const host = el as HTMLElement;
    const path = host.getAttribute(FIELD_ATTR);
    if (!path) continue;
    switch (kindForPath(path)) {
      case "none":
        // Tagged in the markup but not a real CMS field — leave inert.
        continue;
      case "media":
        // Images open the media picker on click (never contenteditable).
        host.setAttribute(MEDIA_ATTR, "");
        break;
      case "link":
        if (host.tagName === "A") {
          // The anchor opens a URL popover; its inner label span arms as text
          // on its own iteration.
          host.setAttribute(LINK_ATTR, "");
        } else if (isEditableCandidate(host)) {
          // A standalone URL string with no anchor — edit it as plain text.
          armTextEditable(host, plaintext);
        }
        break;
      case "text":
        if (isEditableCandidate(host)) armTextEditable(host, plaintext);
        break;
    }
  }
  injectStyle();
}

function disarmEditables(): void {
  for (const el of Array.from(document.querySelectorAll(`[${EDITABLE_ATTR}]`))) {
    el.removeAttribute("contenteditable");
    el.removeAttribute(EDITABLE_ATTR);
  }
  for (const el of Array.from(document.querySelectorAll(`[${MEDIA_ATTR}]`)))
    el.removeAttribute(MEDIA_ATTR);
  for (const el of Array.from(document.querySelectorAll(`[${LINK_ATTR}]`)))
    el.removeAttribute(LINK_ATTR);
}

function editableFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(`[${EDITABLE_ATTR}]`);
  return el instanceof HTMLElement ? el : null;
}

function fieldPathOf(el: HTMLElement): string | null {
  return el.getAttribute(FIELD_ATTR);
}

function valueOf(el: HTMLElement): string {
  return (el.textContent ?? "").trim();
}

function scheduleInput(el: HTMLElement, path: string): void {
  if (inputTimer) return;
  inputTimer = setTimeout(() => {
    inputTimer = null;
    post({ type: "field-input", path, value: valueOf(el) });
  }, INPUT_THROTTLE_MS);
}

function commit(el: HTMLElement, path: string, original: string): void {
  if (inputTimer) {
    clearTimeout(inputTimer);
    inputTimer = null;
  }
  const value = valueOf(el);
  if (value === original) return;
  post({ type: "field-commit", path, value });
}

/** Ask the CMS to open a non-text editor (media picker / link popover). */
function activate(el: HTMLElement, kind: "media" | "link"): void {
  const path = el.getAttribute(FIELD_ATTR);
  if (!path) return;
  const value =
    kind === "media"
      ? ((el as HTMLImageElement).currentSrc ??
        (el as HTMLImageElement).src ??
        "")
      : ((el as HTMLAnchorElement).getAttribute("href") ?? "");
  post({ type: "field-activate", path, kind, value });
}

function onFocusIn(event: FocusEvent): void {
  const el = editableFrom(event.target);
  if (!el) return;
  const path = fieldPathOf(el);
  if (!path) return;
  focusSnapshot = { el, path, value: valueOf(el) };
  post({ type: "field-focus", path });
  // Editing a link's label also surfaces its URL editor in the CMS.
  const anchor = el.closest(`[${LINK_ATTR}]`);
  if (anchor instanceof HTMLElement) activate(anchor, "link");
}

function onFocusOut(event: FocusEvent): void {
  const el = editableFrom(event.target);
  if (!el || !focusSnapshot || focusSnapshot.el !== el) return;
  const snap = focusSnapshot;
  focusSnapshot = null;
  commit(el, snap.path, snap.value);
}

function onInput(event: Event): void {
  const el = editableFrom(event.target);
  if (!el) return;
  const path = fieldPathOf(el);
  if (!path) return;
  scheduleInput(el, path);
}

function onBeforeInput(event: InputEvent): void {
  const el = editableFrom(event.target);
  if (!el) return;
  // Single-line plain text: Enter commits, no rich formatting ever.
  if (
    event.inputType === "insertParagraph" ||
    event.inputType === "insertLineBreak" ||
    event.inputType.startsWith("format")
  ) {
    event.preventDefault();
    if (event.inputType === "insertParagraph") el.blur();
  }
}

function onPaste(event: ClipboardEvent): void {
  const el = editableFrom(event.target);
  if (!el) return;
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") ?? "";
  document.execCommand("insertText", false, text.replace(/\s+/g, " "));
}

function onKeyDown(event: KeyboardEvent): void {
  const el = editableFrom(event.target);
  if (!el) return;
  if (event.key === "Enter") {
    event.preventDefault();
    el.blur();
  }
  if (event.key === "Escape") {
    if (focusSnapshot && focusSnapshot.el === el) {
      el.textContent = focusSnapshot.value;
      focusSnapshot = null;
    }
    el.blur();
  }
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  // Clicking an image opens the media picker.
  const media = target.closest(`[${MEDIA_ATTR}]`);
  if (media instanceof HTMLElement) {
    event.preventDefault();
    event.stopPropagation();
    activate(media, "media");
    return;
  }
  // Clicking a link never navigates in edit mode. If the click landed on the
  // editable label, let the caret drop (its focus opens the URL editor);
  // otherwise (icon/padding) open the URL editor directly.
  const link = target.closest(`[${LINK_ATTR}]`);
  if (link instanceof HTMLElement) {
    event.preventDefault();
    if (!editableFrom(target)) activate(link, "link");
    return;
  }
  // Editing text inside a plain <a> must not navigate away.
  const el = editableFrom(target);
  if (el && el.closest("a")) event.preventDefault();
}

// ---------------------------------------------------------------------------
// Messages from the CMS
// ---------------------------------------------------------------------------

function applySet(values: Array<{ path: string; value: string }>): void {
  for (const { path, value } of values) {
    const nodes = document.querySelectorAll(`[${FIELD_ATTR}="${esc(path)}"]`);
    for (const el of Array.from(nodes)) {
      if (el === document.activeElement) continue; // never stomp the caret
      // The kind of write is inferred from the element: images set src, anchors
      // set href, everything else sets text.
      if (el.tagName === "IMG") {
        (el as HTMLImageElement).src = value;
      } else if (el.tagName === "A") {
        (el as HTMLAnchorElement).href = value;
      } else {
        el.textContent = value;
      }
    }
  }
}

function setMode(next: BridgeMode): void {
  if (next === mode) return;
  mode = next;
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
  if (mode === "edit") armEditables();
  else disarmEditables();
}

function onMessage(event: MessageEvent): void {
  const data = event.data as unknown;
  // Legacy focus from older CMS builds.
  if (
    typeof data === "object" &&
    data !== null &&
    (data as LegacyFieldFocusMessage).type === "cms-field-focus"
  ) {
    highlight((data as LegacyFieldFocusMessage).field);
    return;
  }
  if (!isBridgeEnvelope(data)) return;
  const msg = data as CmsToBridgeMessage;
  switch (msg.type) {
    case "focus":
      highlight(msg.path);
      break;
    case "set":
      applySet(msg.values);
      break;
    case "mode":
      setMode(msg.mode);
      break;
    case "editable": {
      // An all-empty whitelist means "no schema info" (e.g. a CMS bug or a
      // legacy handshake echo), never "nothing is editable" — a page with zero
      // real fields wouldn't be armed for editing at all. Treat it as absent
      // so a bad message can't brick the page.
      if (!msg.arm.length && !msg.media.length && !msg.link.length) break;
      editable = {
        arm: new Set(msg.arm),
        media: new Set(msg.media),
        link: new Set(msg.link),
      };
      if (mode === "edit") {
        disarmEditables();
        armEditables();
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function collectFields(): string[] {
  const out = new Set<string>();
  const nodes = document.querySelectorAll(`[${FIELD_ATTR}]`);
  for (const el of Array.from(nodes)) {
    const path = el.getAttribute(FIELD_ATTR);
    if (path) out.add(path);
  }
  return Array.from(out);
}

function announce(): void {
  post({
    type: "ready",
    url: location.href,
    path: location.pathname,
    mode,
    fields: collectFields(),
    caps: ["text", "media", "link"],
  });
  // Legacy handshake for older CMS builds.
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "cms-preview-ready" }, "*");
  }
}

function scan(): void {
  if (mode === "edit") armEditables();
  announce();
}

function resolveMode(): BridgeMode | null {
  const raw = new URLSearchParams(location.search).get(PARAM);
  if (raw !== null) return raw === "edit" ? "edit" : "highlight";
  try {
    const stored = sessionStorage.getItem(MODE_KEY);
    if (stored === "edit" || stored === "highlight") return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function boot(): void {
  if (booted) return;
  const resolved = resolveMode();
  if (!resolved) return;
  booted = true;
  mode = resolved;
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }

  window.addEventListener("message", onMessage);
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  document.addEventListener("input", onInput);
  document.addEventListener("beforeinput", onBeforeInput as EventListener);
  document.addEventListener("paste", onPaste);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("click", onClick, true);
  // Astro ClientRouter swaps the DOM on soft navigation — re-arm + re-announce.
  document.addEventListener("astro:page-load", scan);

  if (document.readyState !== "loading") scan();
  else window.addEventListener("DOMContentLoaded", scan);
}

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
  type FieldInfo,
  type GroupInfo,
  type GroupMember,
  type LegacyFieldFocusMessage,
} from "./protocol";
import { HL_CLASS, readRich, renderRich } from "./rich";

const PARAM = "cms-preview";
const MODE_KEY = "cms-bridge-mode";
const HIGHLIGHT_CLASS = "cms-preview-highlight";
const STYLE_ID = "cms-preview-style";
const FIELD_ATTR = "data-cms-field";
/**
 * Explicit editor kind, emitted by the bridge components (`<Heading1>`,
 * `<Image>`, `<Group>`, …). When present it is trusted outright — no leaf
 * heuristics, no CMS whitelist — which is what makes component-tagged
 * elements reliably editable. Values: "text" | "media" | "link" | "group".
 */
const KIND_ATTR = "data-cms-kind";
/** Index wrapper inside a `<Group>` (`<Item index={i}>`). */
const ITEM_ATTR = "data-cms-item";
const EDITABLE_ATTR = "data-cms-editable";
const MEDIA_ATTR = "data-cms-media";
const LINK_ATTR = "data-cms-link";
const GROUP_ATTR = "data-cms-group";
/** Bridge-injected UI (group add button, item move/remove pills) — never content. */
const UI_ATTR = "data-cms-ui";
const UI_ACTION_ATTR = "data-cms-ui-action";
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
    `[${LINK_ATTR}]:hover{outline:1px dashed rgba(99,102,241,.5);outline-offset:3px;}` +
    `[${GROUP_ATTR}]:hover{outline:1px dashed rgba(99,102,241,.55);outline-offset:4px;cursor:pointer;}` +
    // Group structural-edit UI: add button on the host, move/remove pill per item.
    `[${UI_ATTR}]{font:600 12px/1 system-ui,sans-serif;}` +
    `[${UI_ATTR}="group-add"]{position:absolute;top:8px;right:8px;z-index:2147483000;` +
    `border:0;border-radius:9999px;background:#6366f1;color:#fff;padding:6px 12px;` +
    `cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:0;transition:opacity .15s;}` +
    `[${KIND_ATTR}="group"]:hover>[${UI_ATTR}="group-add"]{opacity:1;}` +
    `[${UI_ATTR}="item-controls"]{position:absolute;top:8px;right:8px;z-index:2147483000;` +
    `display:flex;gap:2px;border-radius:9999px;background:rgba(24,24,27,.85);padding:2px;` +
    `opacity:0;transition:opacity .15s;}` +
    `[${ITEM_ATTR}]:hover>[${UI_ATTR}="item-controls"]{opacity:1;}` +
    `[${UI_ATTR}="item-controls"] button{border:0;border-radius:9999px;background:transparent;` +
    `color:#fff;width:24px;height:24px;cursor:pointer;display:grid;place-items:center;}` +
    `[${UI_ATTR}="item-controls"] button:hover{background:#6366f1;}`;
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

type FieldKind = "text" | "media" | "link" | "group" | "none";

const EXPLICIT_KINDS = new Set(["text", "media", "link", "group"]);

/** Explicit `data-cms-kind` from a bridge component, or null. */
function declaredKind(el: Element): FieldKind | null {
  const raw = el.getAttribute(KIND_ATTR);
  return raw && EXPLICIT_KINDS.has(raw) ? (raw as FieldKind) : null;
}

/** What editor a tagged path gets. Without a whitelist, everything is text. */
function kindForPath(path: string): FieldKind {
  if (!editable) return "text";
  if (editable.media.has(path)) return "media";
  if (editable.link.has(path)) return "link";
  if (editable.arm.has(path)) return "text";
  return "none";
}

/**
 * The editor kind of an element. An explicit `data-cms-kind` (bridge
 * component) is trusted outright; otherwise fall back to the CMS whitelist
 * (legacy schema-driven sites) or, absent both, plain text.
 */
function kindOf(el: Element, path: string): FieldKind {
  return declaredKind(el) ?? kindForPath(path);
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
    // Only the top-level tagged element of a cluster is interactive. Anything
    // with a tagged ancestor is edited through that ancestor's group popover,
    // never inline — EXCEPT component-declared elements (`data-cms-kind`),
    // which are always individually editable: inside a `<Group>` every
    // `<Text>`/`<Image>` item child must arm on its own.
    if (
      !declaredKind(host) &&
      host.parentElement?.closest(`[${FIELD_ATTR}]`)
    ) {
      continue;
    }
    switch (kindOf(host, path)) {
      case "none":
        // Tagged in the markup but not a real CMS field — leave inert.
        continue;
      case "group":
        // Explicit `<Group>` host: click opens the CMS group editor. Its item
        // children arm individually on their own iterations.
        host.setAttribute(GROUP_ATTR, "");
        break;
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
        if (isEditableCandidate(host)) {
          armTextEditable(host, plaintext);
        } else if (!host.hasAttribute(GROUP_ATTR)) {
          // Non-leaf text field — it wraps other tagged fields (or media), so it
          // can't be contenteditable. Arm it as a group host: a click opens the
          // CMS popover editing this field plus its tagged descendants. Those
          // descendants still arm on their own loop iterations, so inline
          // editing of the inner span keeps working.
          host.setAttribute(GROUP_ATTR, "");
        }
        break;
    }
  }
  injectStyle();
}

function disarmEditables(): void {
  removeGroupControls();
  for (const el of Array.from(document.querySelectorAll(`[${EDITABLE_ATTR}]`))) {
    el.removeAttribute("contenteditable");
    el.removeAttribute(EDITABLE_ATTR);
  }
  for (const el of Array.from(document.querySelectorAll(`[${MEDIA_ATTR}]`)))
    el.removeAttribute(MEDIA_ATTR);
  for (const el of Array.from(document.querySelectorAll(`[${LINK_ATTR}]`)))
    el.removeAttribute(LINK_ATTR);
  for (const el of Array.from(document.querySelectorAll(`[${GROUP_ATTR}]`)))
    el.removeAttribute(GROUP_ATTR);
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
  // Re-render `backtick` spans in this frame (the element was flattened to plain
  // source while editing). Always — even on an unchanged/Escape revert.
  el.innerHTML = renderRich(value);
  if (value === original) return;
  post({ type: "field-commit", path, value });
}

/**
 * The editable fields inside a group host: the host itself first, then every
 * tagged descendant that resolves to a real CMS field. Deduped by path so a
 * descendant that is itself a group host isn't listed twice.
 */
function collectGroupMembers(host: HTMLElement): GroupMember[] {
  const out: GroupMember[] = [];
  const seen = new Set<string>();
  const push = (el: Element): void => {
    const path = el.getAttribute(FIELD_ATTR);
    if (!path || seen.has(path)) return;
    const kind = kindOf(el, path);
    if (kind === "none" || kind === "group") return;
    seen.add(path);
    out.push({ path, kind });
  };
  push(host);
  for (const el of Array.from(host.querySelectorAll(`[${FIELD_ATTR}]`))) push(el);
  return out;
}

/** Ask the CMS to open the group popover for a non-leaf tagged host. */
function activateGroup(host: HTMLElement): void {
  const path = host.getAttribute(FIELD_ATTR);
  if (!path) return;
  const rect = host.getBoundingClientRect();
  post({
    type: "field-activate",
    path,
    kind: "group",
    members: collectGroupMembers(host),
    rect: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
  });
}

// ---------------------------------------------------------------------------
// Group structural editing (add / remove / reorder items).
//
// Hub-authoritative: the bridge only posts `group-op`; the CMS splices the
// draft array and answers `group-apply`, which mutates the DOM (cloneNode for
// add, remove, reinsert for move), reindexes every descendant field path
// positionally from DOM order, then applies the flattened values.
// ---------------------------------------------------------------------------

/** The `<Item>` wrappers that belong directly to this group host (DOM order). */
function groupItems(host: Element): HTMLElement[] {
  return Array.from(host.querySelectorAll(`[${ITEM_ATTR}]`)).filter(
    (item): item is HTMLElement =>
      item instanceof HTMLElement &&
      item.parentElement?.closest(`[${KIND_ATTR}="group"]`) === host
  );
}

/** Flush any in-flight edit (blur commits; old-index paths must not fire late). */
function flushPendingEdit(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.hasAttribute(EDITABLE_ATTR)) {
    active.blur(); // synchronously dispatches focusout → commit
  }
  if (inputTimer) {
    clearTimeout(inputTimer);
    inputTimer = null;
  }
}

function requestGroupOp(
  host: HTMLElement,
  op: "add" | "remove" | "move",
  index: number,
  toIndex?: number
): void {
  const path = host.getAttribute(FIELD_ATTR);
  if (!path) return;
  flushPendingEdit();
  post({ type: "group-op", path, op, index, toIndex });
}

/** Remove bridge-injected UI and runtime attrs from a cloned item subtree. */
function sanitizeClone(clone: HTMLElement): void {
  for (const ui of Array.from(clone.querySelectorAll(`[${UI_ATTR}]`)))
    ui.remove();
  const nodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  for (const node of nodes) {
    node.removeAttribute("contenteditable");
    node.removeAttribute(EDITABLE_ATTR);
    node.removeAttribute(MEDIA_ATTR);
    node.removeAttribute(LINK_ATTR);
    node.removeAttribute(GROUP_ATTR);
    node.classList.remove(HIGHLIGHT_CLASS);
  }
}

/**
 * Rewrite `data-cms-item` indices and the index segment of every descendant
 * `data-cms-field` from DOM order. Positional (never string-replace of the old
 * index), so it is idempotent and never double-shifts.
 */
function reindexGroup(host: HTMLElement, path: string): void {
  const prefix = `${path}.`;
  groupItems(host).forEach((item, index) => {
    item.setAttribute(ITEM_ATTR, String(index));
    const tagged = [item, ...Array.from(item.querySelectorAll(`[${FIELD_ATTR}]`))];
    for (const el of tagged) {
      const field = el.getAttribute(FIELD_ATTR);
      if (!field || !field.startsWith(prefix)) continue;
      const rest = field.slice(prefix.length);
      const dot = rest.indexOf(".");
      const tail = dot === -1 ? "" : rest.slice(dot);
      el.setAttribute(FIELD_ATTR, `${prefix}${index}${tail}`);
    }
  });
}

/** Apply a CMS-confirmed structural op to the DOM. No-op on `ok: false`. */
function applyGroupOp(msg: {
  ok: boolean;
  path: string;
  op: "add" | "remove" | "move";
  index: number;
  toIndex?: number;
  values?: Array<{ path: string; value: string }>;
}): void {
  if (!msg.ok) return;
  const host = document.querySelector(
    `[${KIND_ATTR}="group"][${FIELD_ATTR}="${esc(msg.path)}"]`
  );
  if (!(host instanceof HTMLElement)) return;
  const items = groupItems(host);
  if (msg.op === "add") {
    const source = items[msg.index] ?? items[items.length - 1];
    if (!source) return; // empty group — no DOM template to clone
    const clone = source.cloneNode(true) as HTMLElement;
    sanitizeClone(clone);
    source.after(clone);
  } else if (msg.op === "remove") {
    items[msg.index]?.remove();
  } else if (msg.op === "move" && typeof msg.toIndex === "number") {
    const item = items[msg.index];
    const target = items[msg.toIndex];
    if (!item || !target || item === target) return;
    if (msg.toIndex > msg.index) target.after(item);
    else target.before(item);
  }
  reindexGroup(host, msg.path);
  if (msg.values) applySet(msg.values);
  if (mode === "edit") {
    armEditables();
    attachGroupControls();
  }
}

/** Inject the add button on each group host + move/remove pills on each item. */
function attachGroupControls(): void {
  if (mode !== "edit") return;
  for (const host of Array.from(
    document.querySelectorAll(`[${KIND_ATTR}="group"]`)
  )) {
    if (!(host instanceof HTMLElement)) continue;
    if (getComputedStyle(host).position === "static")
      host.style.position = "relative";
    if (!host.querySelector(`:scope > [${UI_ATTR}="group-add"]`)) {
      const add = document.createElement("button");
      add.type = "button";
      add.setAttribute(UI_ATTR, "group-add");
      add.setAttribute(UI_ACTION_ATTR, "add");
      add.textContent = "+ Add";
      host.appendChild(add);
    }
    for (const item of groupItems(host)) {
      if (getComputedStyle(item).position === "static")
        item.style.position = "relative";
      if (item.querySelector(`:scope > [${UI_ATTR}="item-controls"]`)) continue;
      const pill = document.createElement("div");
      pill.setAttribute(UI_ATTR, "item-controls");
      for (const [label, action, title] of [
        ["↑", "move-up", "Move up"],
        ["↓", "move-down", "Move down"],
        ["✕", "remove", "Remove"],
      ] as const) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute(UI_ACTION_ATTR, action);
        button.textContent = label;
        button.title = title;
        pill.appendChild(button);
      }
      item.appendChild(pill);
    }
  }
}

function removeGroupControls(): void {
  for (const el of Array.from(document.querySelectorAll(`[${UI_ATTR}]`)))
    el.remove();
}

/** Route a click on injected group UI to the matching `group-op`. */
function handleUiAction(el: HTMLElement): void {
  const action = el.getAttribute(UI_ACTION_ATTR);
  const host = el.closest(`[${KIND_ATTR}="group"]`);
  if (!action || !(host instanceof HTMLElement)) return;
  const items = groupItems(host);
  if (action === "add") {
    requestGroupOp(host, "add", Math.max(0, items.length - 1));
    return;
  }
  const item = el.closest(`[${ITEM_ATTR}]`);
  if (!(item instanceof HTMLElement)) return;
  const index = items.indexOf(item);
  if (index === -1) return;
  if (action === "remove") requestGroupOp(host, "remove", index);
  else if (action === "move-up" && index > 0)
    requestGroupOp(host, "move", index, index - 1);
  else if (action === "move-down" && index < items.length - 1)
    requestGroupOp(host, "move", index, index + 1);
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
  // Editing a highlighted field: flatten its spans back to `backtick` source so
  // the user edits plain text (skip when there's no highlight, to keep the caret).
  if (el.querySelector(`.${HL_CLASS}`)) el.textContent = readRich(el);
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
  // Bridge-injected group UI (add / move / remove) wins over everything —
  // it must never fall through to the group popover or link handling.
  const uiAction = target.closest(`[${UI_ACTION_ATTR}]`);
  if (uiAction instanceof HTMLElement) {
    event.preventDefault();
    event.stopPropagation();
    handleUiAction(uiAction);
    return;
  }
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
  // A non-leaf group host opens the CMS popover — unless the click landed on an
  // inner editable text child (media/link children were handled + returned
  // above), in which case inline editing wins and the caret drops.
  const group = target.closest(`[${GROUP_ATTR}]`);
  if (group instanceof HTMLElement && !editableFrom(target)) {
    event.preventDefault();
    event.stopPropagation();
    activateGroup(group);
    return;
  }
  // Any remaining link (nav, footer, CTA — not a CMS field, not in a cluster):
  // never navigate the iframe in edit mode. Show its destination in the CMS
  // instead, unless the click landed on inline-editable text (caret drops).
  const anchor = target.closest("a");
  if (anchor instanceof HTMLElement) {
    event.preventDefault();
    event.stopPropagation(); // also stop Astro's client-router navigation
    if (!editableFrom(target)) {
      const r = anchor.getBoundingClientRect();
      post({
        type: "link-info",
        href: anchor.getAttribute("href") ?? "",
        rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Messages from the CMS
// ---------------------------------------------------------------------------

/**
 * Write `value` as the element's own text WITHOUT touching nested tagged
 * children. Used for group hosts (e.g. a heading wrapping a highlight span):
 * `textContent = value` would delete the span. The host's own text is the
 * first text node; any later stray text nodes are cleared so the value isn't
 * duplicated. Known limitation: text authored after the children still lands
 * in the first text node — fine for the common "text + inline highlight" case.
 */
// Backtick highlight helpers (renderRich/readRich) live in ./rich — shared
// with the server-rendered bridge components so markup stays byte-identical.

function setOwnText(el: Element, value: string): void {
  const textNodes = Array.from(el.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE
  );
  if (textNodes.length === 0) {
    el.insertBefore(document.createTextNode(value), el.firstChild);
    return;
  }
  textNodes[0]!.textContent = value;
  for (let i = 1; i < textNodes.length; i++) textNodes[i]!.textContent = "";
}

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
      } else if (el.querySelector(`[${FIELD_ATTR}]`)) {
        // Group host: preserve nested tagged children, write only its own text.
        setOwnText(el, value);
      } else {
        // Leaf text: render `backtick` highlights as spans (plain text otherwise).
        el.innerHTML = renderRich(value);
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
  if (mode === "edit") {
    armEditables();
    attachGroupControls();
  } else {
    disarmEditables();
  }
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
        attachGroupControls();
      }
      break;
    }
    case "group-apply":
      applyGroupOp(msg);
      break;
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

/**
 * CMS v2 field inventory: every tagged field with its kind. Explicit
 * `data-cms-kind` (bridge components) is reported as declared; otherwise the
 * kind is inferred from the element so the hub needs no schema.
 */
function collectFieldsV2(): FieldInfo[] {
  const out: FieldInfo[] = [];
  const seen = new Set<string>();
  for (const el of Array.from(document.querySelectorAll(`[${FIELD_ATTR}]`))) {
    const path = el.getAttribute(FIELD_ATTR);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const declared = declaredKind(el);
    const kind =
      declared ??
      (el.tagName === "IMG"
        ? "media"
        : el.tagName === "A"
          ? "link"
          : "text");
    out.push({ path, kind: kind as FieldInfo["kind"], declared: !!declared });
  }
  return out;
}

/** Rendered `<Group>` hosts and how many direct `data-cms-item` children each holds. */
function collectGroups(): GroupInfo[] {
  const out: GroupInfo[] = [];
  for (const el of Array.from(
    document.querySelectorAll(`[${KIND_ATTR}="group"]`)
  )) {
    const path = el.getAttribute(FIELD_ATTR);
    if (!path) continue;
    const count = Array.from(el.querySelectorAll(`[${ITEM_ATTR}]`)).filter(
      (item) =>
        item.parentElement?.closest(`[${KIND_ATTR}="group"]`) === el
    ).length;
    out.push({ path, count });
  }
  return out;
}

function announce(): void {
  post({
    type: "ready",
    url: location.href,
    path: location.pathname,
    mode,
    fields: collectFields(),
    caps: ["text", "media", "link", "group", "group-ops"],
    fieldsV2: collectFieldsV2(),
    groups: collectGroups(),
  });
  // Legacy handshake for older CMS builds.
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "cms-preview-ready" }, "*");
  }
}

function scan(): void {
  if (mode === "edit") {
    armEditables();
    attachGroupControls();
  }
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

// Exported for tests only — not part of the public bridge API.
export { groupItems as _groupItems, reindexGroup as _reindexGroup };

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

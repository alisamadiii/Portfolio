/**
 * Backtick highlight: `word` in a text field ⇄ <span class="cms-hl">word</span>.
 * Lets a heading keep its colored phrase in a single plain field (no nested
 * data-cms-field). Shared by the browser bridge (client.ts) and the server-
 * rendered bridge components (components/*.astro), so the markup they produce
 * is byte-identical.
 */

/** Class wrapping a `backtick`-highlighted run in a text field. Styled by the site. */
export const HL_CLASS = "cms-hl";

/** Source string (with backticks) → safe HTML with highlight spans. */
export function renderRich(source: string): string {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /`([^`]+)`/g,
    (_match, inner) => `<span class="${HL_CLASS}">${inner}</span>`
  );
}

/** Rendered element (highlight spans) → source string with backticks. */
export function readRich(el: HTMLElement): string {
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
    } else if (
      node instanceof HTMLElement &&
      node.classList.contains(HL_CLASS)
    ) {
      out += "`" + (node.textContent ?? "") + "`";
    } else {
      out += (node as HTMLElement).textContent ?? "";
    }
  }
  return out;
}

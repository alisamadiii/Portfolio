/**
 * Inline rich text in a SINGLE field — no nested data-cms-field needed, and it
 * round-trips through canvas editing. Two conventions:
 *
 *   `word`     ⇄  <span class="cms-hl">word</span>     (accent highlight)
 *   **word**   ⇄  <span class="cms-mark …">word</span> (mark — styleable)
 *
 * Shared by the browser bridge (client.ts) and the server-rendered bridge
 * components (components/*.astro) so the markup they produce is byte-identical.
 * The value stored in JSON is always the plain source (with ` and **), so a
 * heading like "Wood-fired **pasta**" stays one editable string. The mark
 * span's extra class/style come from the component's `markClass`/`markStyle`
 * props, carried on the host's data-cms-mark-class/-style attributes so the
 * bridge can reconstruct them on every re-render (see client.ts).
 */

/** Class wrapping a `backtick`-highlighted run in a text field. Styled by the site. */
export const HL_CLASS = "cms-hl";
/** Base class on a **mark** run. Style it once globally; extend via markClass. */
export const MARK_CLASS = "cms-mark";

type RichOptions = {
  /** Extra class(es) appended to the mark span (e.g. Tailwind utilities). */
  markClass?: string;
  /** Inline style string applied to the mark span. */
  markStyle?: string;
};

/** Source string (with ` and **) → safe HTML with highlight/mark markup. */
export function renderRich(source: string, opts: RichOptions = {}): string {
  const cls = opts.markClass ? `${MARK_CLASS} ${opts.markClass}` : MARK_CLASS;
  const styleAttr = opts.markStyle ? ` style="${opts.markStyle}"` : "";
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(
      /\*\*([^*]+)\*\*/g,
      (_match, inner) => `<span class="${cls}"${styleAttr}>${inner}</span>`
    )
    .replace(
      /`([^`]+)`/g,
      (_match, inner) => `<span class="${HL_CLASS}">${inner}</span>`
    );
}

/** Rendered element (highlight / mark spans) → source string with ` and **. */
export function readRich(el: HTMLElement): string {
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
    } else if (node instanceof HTMLElement) {
      const text = node.textContent ?? "";
      if (node.classList.contains(HL_CLASS)) out += "`" + text + "`";
      else if (
        node.classList.contains(MARK_CLASS) ||
        node.tagName === "STRONG" ||
        node.tagName === "B"
      )
        // cms-mark spans + authored <strong>/<b> (back-compat) → ** source.
        out += "**" + text + "**";
      else out += text;
    } else {
      out += (node as ChildNode).textContent ?? "";
    }
  }
  return out;
}

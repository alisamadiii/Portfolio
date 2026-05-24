import type { ElementMeta } from "../types";

export function isDevToolsElement(el: Element | null): boolean {
  if (!el) return false;
  if (el.hasAttribute("data-devtools-ignore")) return true;
  return isDevToolsElement(el.parentElement);
}

/**
 * Generate a unique CSS selector using strict nth-child positional path.
 * Every level gets :nth-child(n) to guarantee uniqueness even when
 * multiple elements share the same tag/classes.
 */
export function getCssSelector(element: Element): string {
  if (element.id) return `#${element.id}`;

  const parts: string[] = [];
  let current: Element | null = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    const tag = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }

    // Always use nth-child for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const index =
        Array.from(parent.children).indexOf(current) + 1;
      parts.unshift(`${tag}:nth-child(${index})`);
    } else {
      parts.unshift(tag);
    }

    current = current.parentElement;
  }

  return parts.join(" > ");
}

export function getElementMeta(element: Element): ElementMeta {
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList);
  const id = element.id || null;
  const isImage = tag === "img";
  const imageSrc = isImage ? (element as HTMLImageElement).src : null;

  const dataAttributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (
      attr.name.startsWith("data-") &&
      !attr.name.startsWith("data-devtools")
    ) {
      dataAttributes[attr.name] = attr.value;
    }
  }

  const textContent = (element.textContent || "").trim().slice(0, 200);

  return {
    selector: getCssSelector(element),
    tag,
    classes,
    id,
    textContent,
    dataAttributes,
    isImage,
    imageSrc,
  };
}

export function getElementLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith("_") && c.length < 30)
    .slice(0, 2);

  if (element.id) return `${tag}#${element.id}`;
  if (classes.length > 0) return `${tag}.${classes.join(".")}`;
  return tag;
}

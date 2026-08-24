// Regex-based markdown parsing — the body arrives as markdown (TipTap
// serializes to it), and headings/links/images/word counts don't need an AST.

export type SeoLink = { text: string; href: string; internal: boolean };
export type SeoImage = { alt: string; src: string };

export const stripCode = (md: string): string =>
  md.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");

export const extractImages = (md: string): SeoImage[] => {
  const images: SeoImage[] = [];
  const re = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
  let match: RegExpExecArray | null;
  const source = stripCode(md);
  while ((match = re.exec(source)) !== null) {
    images.push({ alt: match[1]!.trim(), src: match[2]! });
  }
  return images;
};

// Internal = relative (/, #, ./, ../, schemeless). Outbound = http(s)://.
// The editor doesn't know the site's domain, so absolute links to the own
// site count as outbound — write internal links relative.
const isInternalHref = (href: string): boolean =>
  !/^[a-z][a-z0-9+.-]*:/i.test(href);

export const extractLinks = (md: string): SeoLink[] => {
  const links: SeoLink[] = [];
  const re = /(?<!!)\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
  let match: RegExpExecArray | null;
  const source = stripCode(md);
  while ((match = re.exec(source)) !== null) {
    const href = match[2]!;
    if (/^mailto:|^tel:/i.test(href)) continue;
    links.push({
      text: match[1]!.trim(),
      href,
      internal: isInternalHref(href),
    });
  }
  return links;
};

export const extractHeadings = (md: string): string[] => {
  const headings: string[] = [];
  const re = /^#{2,3}\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  const source = stripCode(md);
  while ((match = re.exec(source)) !== null) {
    headings.push(toPlainText(match[1]!));
  }
  return headings;
};

export const toPlainText = (md: string): string =>
  stripCode(md)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images gone
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep text
    .replace(/^#{1,6}\s+/gm, "") // heading markers
    .replace(/^>\s?/gm, "") // blockquote markers
    .replace(/^[-*+]\s+/gm, "") // list markers
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^(?:[-*_]\s*){3,}$/gm, " ") // horizontal rules
    .replace(/<[^>]+>/g, " ") // inline html
    .replace(/[*_~]+/g, "") // emphasis
    .replace(/\|/g, " ") // table pipes
    .replace(/\s+/g, " ")
    .trim();

// First real paragraph of copy: skips headings, images, code, tables, rules.
export const firstParagraph = (md: string): string => {
  const blocks = stripCode(md).split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (/^!\[/.test(trimmed)) continue;
    if (/^\|/.test(trimmed)) continue;
    if (/^(?:[-*_]\s*){3,}$/.test(trimmed)) continue;
    const text = toPlainText(trimmed);
    if (text) return text;
  }
  return "";
};

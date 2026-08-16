/**
 * CMS bridge components for Astro client sites. Every component REQUIRES a
 * `field` prop and emits `data-cms-field` + `data-cms-kind`, which makes it
 * reliably editable on the CMS canvas — no heuristics, no schema.
 *
 *   import { Heading1, Text, Image, Link, Group, Item }
 *     from "@alisamadiillc/cms-bridge/components";
 */
export { default as Heading1 } from "./Heading1.astro";
export { default as Heading2 } from "./Heading2.astro";
export { default as Heading3 } from "./Heading3.astro";
export { default as Text } from "./Text.astro";
export { default as Image } from "./Image.astro";
export { default as Link } from "./Link.astro";
export { default as Group } from "./Group.astro";
export { default as Item } from "./Item.astro";

/**
 * CMS bridge components for Astro client sites. The field components REQUIRE a
 * `field` prop and emit `data-cms-field` + `data-cms-kind`, which makes them
 * reliably editable on the CMS canvas — no heuristics, no schema. `<Collection>`
 * is the exception: it takes a required `collection` name and marks a region
 * whose entries are edited on the collection page (purple outline + button).
 *
 *   import { Heading1, Text, Image, Link, Group, Item, Collection }
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
export { default as Collection } from "./Collection.astro";

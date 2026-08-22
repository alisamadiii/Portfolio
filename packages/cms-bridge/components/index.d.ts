/**
 * Public prop types for the bridge components.
 *
 * The components themselves are `.astro` files. Astro's language server does
 * NOT generate prop types for `.astro` files imported from `node_modules`, so
 * consumers would otherwise get no autocomplete, no typo-checking, and no
 * required-prop errors on `<Text field=…>` / `<Collection collection=…>` — the
 * types only "worked" while the package was `pnpm link`ed (a symlink realpath
 * resolves outside node_modules, which Astro does type-check).
 *
 * This hand-authored declaration restores type-safety from a published install:
 * it is the `types` target of the `./components` export, while the sibling
 * `index.ts` barrel remains the runtime `default`.
 *
 * `field` is a plain `string` — the package does not constrain field paths.
 * Sites that want autocompleted, typo-checked paths wrap a small typed helper
 * of their own (a `DotPaths<typeof pages.json>` builder) and pass its result
 * into `field`. Keep these Props in sync with the matching `*.astro` files.
 */

/**
 * The consumer-facing type of an Astro component: a callable whose single
 * argument is the props object. This is all Astro/JSX needs to type-check
 * attributes at the call site; the real runtime export is the compiled
 * `.astro` factory from the sibling `index.ts`.
 */
type Component<P> = (props: P) => any;

type LinkValue = { label?: string | null; link?: string | null };

/** Shared shape for the heading/text field components. */
interface FieldProps {
  /** CMS field path (e.g. `"hero.heading"`). Required to pass, but may resolve
   *  to null/undefined (then no CMS attributes emit). */
  field: string | null | undefined;
  value?: string | number | null;
  class?: string;
  [key: string]: unknown;
}

interface TextProps extends FieldProps {
  as?: string;
  /** Extra class(es) applied to **mark** spans in `value` (Tailwind etc.). */
  markClass?: string;
  /** Inline style applied to **mark** spans in `value`. */
  markStyle?: string;
}

interface ImageProps {
  field: string | null | undefined;
  value?: string | null;
  alt?: string | null;
  class?: string;
  [key: string]: unknown;
}

interface LinkProps {
  field: string | null | undefined;
  value?: LinkValue | string | null;
  class?: string;
  [key: string]: unknown;
}

interface GroupProps {
  field: string | null | undefined;
  as?: string;
  class?: string;
  [key: string]: unknown;
}

interface ItemProps {
  index: number;
  as?: string;
  class?: string;
  [key: string]: unknown;
}

interface CollectionProps {
  /** Required, non-empty collection name — the region's entries are edited on
   *  that collection's page. */
  collection: string;
  as?: string;
  class?: string;
  [key: string]: unknown;
}

export declare const Heading1: Component<FieldProps>;
export declare const Heading2: Component<FieldProps>;
export declare const Heading3: Component<FieldProps>;
export declare const Text: Component<TextProps>;
export declare const Image: Component<ImageProps>;
export declare const Link: Component<LinkProps>;
export declare const Group: Component<GroupProps>;
export declare const Item: Component<ItemProps>;
export declare const Collection: Component<CollectionProps>;

export type {
  FieldProps,
  TextProps,
  ImageProps,
  LinkProps,
  GroupProps,
  ItemProps,
  CollectionProps,
  LinkValue,
};

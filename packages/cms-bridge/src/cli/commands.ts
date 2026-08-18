/**
 * Single source of truth for the CLI subcommands. Both the `--help` output and
 * the package.json script shortcuts injected by `init` derive from this list,
 * so adding a command here wires up its `cms:<name>` npm script automatically.
 */

export const COMMANDS = [
  {
    name: "init",
    summary: "Wire pages to the CMS: bridge components + cms/pages/site JSON + skill",
  },
  {
    name: "check",
    summary: "Validate the v2 contract; report un-wired content (exit 1 if work remains)",
  },
  {
    name: "collection",
    summary: "Add a collection to cms.json interactively",
  },
] as const;

/** Obsolete `cms:*` scripts init cleans up when it owns their exact value. */
export const OBSOLETE_COMMANDS = [
  "collections",
  "migrate",
  "collections-to-array",
] as const;

export type CommandName = (typeof COMMANDS)[number]["name"];

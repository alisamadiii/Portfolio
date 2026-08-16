/**
 * Single source of truth for the CLI subcommands. Both the `--help` output and
 * the package.json script shortcuts injected by `init` derive from this list,
 * so adding a command here wires up its `cms:<name>` npm script automatically.
 */

export const COMMANDS = [
  {
    name: "init",
    summary: "Extract static text → JSON, tag elements, write .pages.yml",
  },
  {
    name: "check",
    summary: "Analyze only; writes cms-report.md (exit 1 if work remains)",
  },
  {
    name: "collections",
    summary: "Sync cms/collections/*.yml into .pages.yml",
  },
] as const;

export type CommandName = (typeof COMMANDS)[number]["name"];

/**
 * cms-bridge CLI entry.
 *
 *   cms-bridge init          idempotent codemod + config generation
 *   cms-bridge check         analysis only, writes cms-report.md, exit 1 if work remains
 *   cms-bridge collections   sync cms/collections/*.yml into .pages.yml
 */

import mri from "mri";
import pc from "picocolors";

import { COMMANDS } from "./commands.js";

const NAME_COLUMN = Math.max(...COMMANDS.map((c) => c.name.length)) + 3;
const USAGE = COMMANDS.map(
  (c) => `  cms-bridge ${c.name.padEnd(NAME_COLUMN)}${c.summary}`
).join("\n");

const HELP = `
${pc.bold("cms-bridge")} — make an Astro project CMS-ready

Usage:
${USAGE}

Flags:
  init:         --dry-run  --pages <glob>  --verbose  --yes
  check:        --strict
  collections:  --sample  --dry-run
`;

async function main(): Promise<number> {
  const argv = mri(process.argv.slice(2), {
    boolean: ["dry-run", "verbose", "yes", "strict", "sample", "help"],
    string: ["pages"],
  });
  const command = argv._[0];

  if (argv.help || !command) {
    console.log(HELP);
    return command ? 0 : 1;
  }

  const root = process.cwd();

  switch (command) {
    case "check": {
      const { checkCommand } = await import("./commands/check.js");
      return checkCommand(root, { strict: argv.strict });
    }
    case "init": {
      const { initCommand } = await import("./commands/init.js");
      return initCommand(root, {
        dryRun: argv["dry-run"],
        verbose: argv.verbose,
        yes: argv.yes,
      });
    }
    case "collections": {
      const { collectionsCommand } = await import("./commands/collections.js");
      return collectionsCommand(root, {
        sample: argv.sample,
        dryRun: argv["dry-run"],
      });
    }
    default:
      console.error(`${pc.red("Unknown command:")} ${command}`);
      console.log(HELP);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(pc.red(String(error?.stack ?? error)));
    process.exit(1);
  });

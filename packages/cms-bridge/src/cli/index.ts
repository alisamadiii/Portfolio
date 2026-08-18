/**
 * cms-bridge CLI entry.
 *
 *   cms-bridge init          wire pages to the CMS (idempotent)
 *   cms-bridge check         validate the v2 contract, exit 1 if work remains
 *   cms-bridge collection    add a collection to cms.json interactively
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
  init:   --dry-run  --verbose
`;

async function main(): Promise<number> {
  const argv = mri(process.argv.slice(2), {
    boolean: ["dry-run", "verbose", "help"],
  });
  const command = argv._[0];

  if (argv.help || !command) {
    console.log(HELP);
    return command ? 0 : 1;
  }

  const root = process.cwd();

  switch (command) {
    case "init": {
      const { initCommand } = await import("./commands/init.js");
      return initCommand(root, { dryRun: argv["dry-run"], verbose: argv.verbose });
    }
    case "check": {
      const { checkCommand } = await import("./commands/check.js");
      return checkCommand(root);
    }
    case "collection": {
      const { collectionCommand } = await import("./commands/collection.js");
      return collectionCommand(root);
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

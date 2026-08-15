/**
 * astro.config edit: add the cms-bridge integration. Any uncertainty about
 * the config's shape → "failed" (reported as R10), never a broken config.
 */

import fs from "node:fs";

import { builders, parseModule } from "magicast";
import { getDefaultExportOptions } from "magicast/helpers";

export type ConfigEditResult = "added" | "present" | "failed";

const IMPORT_SOURCE = "@alisamadiillc/cms-bridge/astro";

export function ensureBridgeIntegration(
  configPath: string,
  options?: { dryRun?: boolean }
): ConfigEditResult {
  const source = fs.readFileSync(configPath, "utf8");
  if (source.includes(IMPORT_SOURCE)) return "present";

  try {
    const mod = parseModule(source);
    mod.imports.$prepend({
      from: IMPORT_SOURCE,
      imported: "default",
      local: "cmsBridge",
    });

    const config = getDefaultExportOptions(mod);
    config.integrations ??= [];
    config.integrations.push(builders.functionCall("cmsBridge"));

    const { code } = mod.generate();
    if (!options?.dryRun) fs.writeFileSync(configPath, code);
    return "added";
  } catch {
    return "failed";
  }
}

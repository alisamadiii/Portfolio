/**
 * Interactive dev runner — pick workspaces, run them concurrently.
 * Run with: pnpm go   (alias for: npx tsx scripts/run.ts)
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import * as p from "@clack/prompts";

// pnpm always runs root scripts from the repo root
const ROOT = process.cwd();

type Runnable = {
  name: string;
  dir: string;
  script: string; // script key, e.g. "dev" | "email:dev"
  command: string; // the script's command string, for the hint
  group: "apps" | "packages";
};

function scan(group: "apps" | "packages"): Runnable[] {
  const base = join(ROOT, group);
  const runnables: Runnable[] = [];

  for (const dir of readdirSync(base)) {
    const pkgPath = join(base, dir, "package.json");
    if (!existsSync(pkgPath)) continue; // e.g. apps/agency (static site)

    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      name?: string;
      scripts?: Record<string, string>;
    };
    if (!pkg.name || !pkg.scripts) continue;

    // "dev" first, otherwise any "*:dev" script (e.g. email:dev)
    const script =
      "dev" in pkg.scripts
        ? "dev"
        : Object.keys(pkg.scripts).find((s) => s.endsWith(":dev"));
    if (!script) continue;

    runnables.push({
      name: pkg.name,
      dir: `${group}/${dir}`,
      script,
      command: pkg.scripts[script],
      group,
    });
  }

  return runnables.sort((a, b) => a.name.localeCompare(b.name));
}

function hint(r: Runnable): string {
  const port = r.command.match(/--port[= ](\d+)/)?.[1];
  let base = r.command.replace(/\s*--port[= ]\d+/, "").replace(/\s*--turbopack/, "");
  if (base.length > 40) base = `${base.slice(0, 40)}…`;
  return port ? `${base} :${port}` : base;
}

async function main() {
  const runnables = [...scan("apps"), ...scan("packages")];

  p.intro("dev runner");

  const selected = await p.multiselect({
    message: "Select projects to run (space to toggle, enter to start)",
    options: runnables.map((r) => ({
      value: r,
      label: r.group === "apps" ? r.name : `${r.name} [package]`,
      hint: hint(r),
    })),
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.outro("Nothing selected.");
    return;
  }

  const children: ChildProcess[] = [];

  // Workspaces on the standard "dev" script share one turbo TUI run
  const turboTargets = selected.filter((r) => r.script === "dev");
  if (turboTargets.length > 0) {
    children.push(
      spawn(
        "pnpm",
        [
          "exec",
          "turbo",
          "run",
          "dev",
          ...turboTargets.map((r) => `--filter=${r.name}`),
        ],
        { cwd: ROOT, stdio: "inherit" }
      )
    );
  }

  // Custom-named scripts (e.g. email:dev) run as their own processes
  for (const r of selected.filter((r) => r.script !== "dev")) {
    const args = ["--filter", r.name, r.script];
    // react-email defaults to port 3000, which collides with portfolio
    if (r.name === "@workspace/email") args.push("--", "--port", "3010");
    children.push(spawn("pnpm", args, { cwd: ROOT, stdio: "inherit" }));
  }

  p.log.success(`Running: ${selected.map((r) => r.name).join(", ")}`);

  const killAll = (signal: NodeJS.Signals) => {
    for (const child of children) child.kill(signal);
  };
  process.on("SIGINT", () => killAll("SIGINT"));
  process.on("SIGTERM", () => killAll("SIGTERM"));

  await Promise.all(
    children.map(
      (child) => new Promise<void>((resolve) => child.on("exit", () => resolve()))
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

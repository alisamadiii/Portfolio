#!/usr/bin/env node
// create-saaskit — start a SaaSKit project from a GitHub template repo.
//
// We don't clone. We open GitHub's "create from a template" page so the buyer
// generates their OWN repo (private, in their own account). GitHub gates this:
// the template repos are private, and Polar grants buyers read access on
// purchase — so only buyers can generate from them. No tokens, no secrets.

import { spawnSync } from "node:child_process";
import { stdin, stdout, exit, argv, platform } from "node:process";
import { parseArgs } from "node:util";

// ─── config ──────────────────────────────────────────────────────────────────
const TEMPLATE_OWNER = "alisamadiillc-templates";
const TEMPLATES = {
  "full-stack": {
    name: "full-stack-nextjs",
    label: "Full-Stack — a single batteries-included Next.js app",
  },
  monorepo: {
    name: "monorepo-full-stack",
    label: "Monorepo — Turborepo workspace (web · mobile · api)",
  },
};
const DEFAULT_TEMPLATE = "full-stack";
const BUY_URL = "https://saaskit.alisamadii.com/#pricing";
const PKG_VERSION = "0.2.0";

const templateUrl = (name) =>
  `https://github.com/new?template_owner=${TEMPLATE_OWNER}&template_name=${name}`;

// ─── tiny ANSI helpers (no deps) ─────────────────────────────────────────────
const tty = stdout.isTTY;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = {
  bold: (s) => paint("1", s),
  dim: (s) => paint("2", s),
  red: (s) => paint("31", s),
  green: (s) => paint("32", s),
  cyan: (s) => paint("36", s),
};
const log = (s = "") => stdout.write(s + "\n");
const die = (msg) => {
  log("\n" + c.red("✖ ") + msg + "\n");
  exit(1);
};

function help() {
  log(`
${c.bold("create-saaskit")} ${c.dim("v" + PKG_VERSION)} — start a SaaSKit project

${c.bold("Usage")}
  npx create-saaskit ${c.dim("[options]")}

${c.bold("Options")}
  --template <name>   Template to use (${Object.keys(TEMPLATES).join(", ")}). Prompts if omitted
  --no-open           Print the link instead of opening the browser
  -h, --help          Show this help
  -v, --version       Show version
`);
}

// ─── arg parsing ─────────────────────────────────────────────────────────────
let parsed;
try {
  parsed = parseArgs({
    args: argv.slice(2),
    allowPositionals: true,
    options: {
      template: { type: "string" },
      "no-open": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });
} catch (e) {
  die(e instanceof Error ? e.message : String(e));
}

if (parsed.values.version) {
  log(PKG_VERSION);
  exit(0);
}
if (parsed.values.help) {
  help();
  exit(0);
}

// ─── arrow-key single-select (falls back to index 0 off a TTY) ───────────────
function selectMenu(title, items) {
  return new Promise((resolve) => {
    log(c.bold(title));
    if (!stdin.isTTY || !stdin.setRawMode) {
      items.forEach((it, i) => log(`  ${i === 0 ? c.cyan("❯ " + it) : "  " + c.dim(it)}`));
      resolve(0);
      return;
    }

    let idx = 0;
    const render = (first) => {
      if (!first) stdout.write(`\x1b[${items.length}A`); // cursor up N rows
      items.forEach((it, i) => {
        const active = i === idx;
        stdout.write(`\x1b[2K  ${active ? c.cyan("❯ " + it) : "  " + c.dim(it)}\n`);
      });
    };
    render(true);
    stdout.write("\x1b[?25l"); // hide cursor

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\x1b[?25h"); // show cursor
    };
    const onData = (key) => {
      if (key === "\x03") {
        cleanup();
        log("");
        exit(130); // ctrl-c
      } else if (key === "\x1b[A" || key === "k") {
        idx = (idx - 1 + items.length) % items.length;
        render(false);
      } else if (key === "\x1b[B" || key === "j") {
        idx = (idx + 1) % items.length;
        render(false);
      } else if (/^[1-9]$/.test(key) && Number(key) <= items.length) {
        idx = Number(key) - 1;
        render(false);
      } else if (key === "\r" || key === "\n") {
        cleanup();
        resolve(idx);
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}

function openBrowser(url) {
  const [cmd, args] =
    platform === "darwin"
      ? ["open", [url]]
      : platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    return spawnSync(cmd, args, { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  log("\n" + c.bold(c.cyan("◆ create-saaskit")) + c.dim("  ship your SaaS this weekend\n"));

  const names = Object.keys(TEMPLATES);
  let templateName = parsed.values.template;
  if (templateName && !TEMPLATES[templateName]) {
    die(`Unknown template "${templateName}". Available: ${names.join(", ")}.`);
  }
  if (!templateName) {
    const idx = await selectMenu(
      "Pick a template " + c.dim("(↑/↓, enter)"),
      names.map((n) => TEMPLATES[n].label),
    );
    templateName = names[idx] || DEFAULT_TEMPLATE;
  }

  const url = templateUrl(TEMPLATES[templateName].name);
  const opened = !parsed.values["no-open"] && openBrowser(url);

  log("");
  log(
    opened
      ? c.green("✔ Opened GitHub") + " to create your repo from the template."
      : c.bold("Create your repo from the template:"),
  );
  log("\n  " + c.cyan(url) + "\n");

  log(c.dim("  On GitHub:"));
  log("    1. Name your new repo and choose " + c.bold("Private") + ".");
  log("    2. Click " + c.bold("Create repository") + " — it's yours, full history-free.\n");

  log(c.dim("  Then locally:"));
  log("    " + c.cyan("git clone <your-new-repo-url>"));
  log("    " + c.cyan("cd <your-repo> && cp .env.example .env.local"));
  log("    " + c.cyan("pnpm install && pnpm dev") + "\n");

  log(
    c.dim("  No access to the template? It's private — buy + connect GitHub: ") +
      c.cyan(BUY_URL),
  );
  log("");
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));

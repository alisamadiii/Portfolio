/**
 * Webhook Sync Check — compares Stripe Dashboard webhook events
 * against locally handled events in packages/auth/src/auth.ts.
 * Run: pnpm webhooks:check
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { config } from "dotenv";
import Stripe from "stripe";

const PACKAGE_ROOT = resolve(import.meta.dirname, "..");

config({ path: resolve(process.cwd(), "apps/portfolio/.env") });

// ─── Validate env ──────────────────────────────────────────────────
if (!process.env.STRIPE_SECRET_KEY?.trim()) {
  console.log(
    `\n  \x1b[41m\x1b[1m\x1b[37m ✗ MISSING \x1b[0m  \x1b[31mSTRIPE_SECRET_KEY\x1b[0m is not set in \x1b[33mapps/portfolio/.env\x1b[0m\n`
  );
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── ANSI helpers ──────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  white: "\x1b[37m",
};

const log = console.log;

// ─── Event categories ──────────────────────────────────────────────
const CATEGORY_PREFIXES: [string, string][] = [
  ["product.", "products"],
  ["payment_intent.", "orders"],
  ["charge.", "orders"],
  ["checkout.", "orders"],
  ["invoice.", "invoices"],
  ["customer.subscription.", "subscriptions"],
];

function categorize(event: string): string {
  for (const [prefix, category] of CATEGORY_PREFIXES) {
    if (event.startsWith(prefix)) return category;
  }
  return "other";
}

function groupByCategory(events: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const e of events.sort()) {
    const cat = categorize(e);
    (grouped[cat] ??= []).push(e);
  }
  return grouped;
}

// ─── Parse local events from auth.ts ───────────────────────────────
function getLocalEvents(): Set<string> {
  const authPath = resolve(PACKAGE_ROOT, "src/auth.ts");
  const content = readFileSync(authPath, "utf-8");
  const regex = /event\.type\s*===\s*"([^"]+)"/g;
  const events = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    events.add(match[1]);
  }
  return events;
}

// ─── Fetch Stripe webhook events ──────────────────────────────────
async function getStripeEvents(): Promise<{
  events: Set<string>;
  hasWildcard: boolean;
  endpoints: { id: string; url: string; events: string[] }[];
}> {
  const list = await stripe.webhookEndpoints.list();
  const events = new Set<string>();
  let hasWildcard = false;
  const endpoints: { id: string; url: string; events: string[] }[] = [];

  for (const ep of list.data) {
    if (!ep.enabled_events) continue;
    endpoints.push({ id: ep.id, url: ep.url, events: [...ep.enabled_events] });

    if (ep.enabled_events.includes("*")) {
      hasWildcard = true;
    }
    for (const evt of ep.enabled_events) {
      if (evt !== "*") events.add(evt);
    }
  }

  return { events, hasWildcard, endpoints };
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  log();

  const localEvents = getLocalEvents();

  let stripeData: Awaited<ReturnType<typeof getStripeEvents>>;
  try {
    stripeData = await getStripeEvents();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(
      `  ${c.bgRed}${c.bold}${c.white} ✗ STRIPE API ${c.reset}  ${c.red}${msg}${c.reset}\n`
    );
    process.exit(1);
  }

  const { events: stripeEvents, hasWildcard, endpoints } = stripeData;

  // Show endpoints
  log(`  ${c.bold}${c.cyan}Webhook Endpoints${c.reset}`);
  for (const ep of endpoints) {
    const label = hasWildcard && ep.events.includes("*") ? " (wildcard)" : "";
    log(
      `  ${c.gray}│${c.reset} ${c.dim}${ep.url}${c.reset}${c.yellow}${label}${c.reset}  ${c.gray}(${ep.events.length} events)${c.reset}`
    );
  }
  log();

  if (hasWildcard) {
    log(
      `  ${c.bgYellow}${c.bold}${c.white} ⚠ WILDCARD ${c.reset}  Stripe endpoint uses ${c.yellow}*${c.reset} — all events enabled. Only checking local handlers.\n`
    );
  }

  // Compare
  const inSync = [...localEvents].filter(
    (e) => hasWildcard || stripeEvents.has(e)
  );
  const notHandled = [...stripeEvents].filter((e) => !localEvents.has(e));
  const notEnabled = hasWildcard
    ? []
    : [...localEvents].filter((e) => !stripeEvents.has(e));

  const hasIssues = notHandled.length > 0 || notEnabled.length > 0;

  // ─── In Sync ───────────────────────────────────────────────────
  if (inSync.length > 0) {
    log(
      `  ${c.bgGreen}${c.bold}${c.white} ✓ SYNCED ${c.reset}  ${c.green}${inSync.length}${c.reset} event${inSync.length !== 1 ? "s" : ""} in sync`
    );
    log();

    const grouped = groupByCategory(inSync);
    for (const [category, events] of Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      log(`  ${c.cyan}${c.bold}${category}${c.reset}`);
      for (const e of events) {
        log(`  ${c.green}│${c.reset} ${c.dim}●${c.reset}  ${e}`);
      }
      log();
    }
  }

  // ─── Not Handled ───────────────────────────────────────────────
  if (notHandled.length > 0) {
    log(
      `  ${c.bgYellow}${c.bold}${c.white} ⚠ NOT HANDLED ${c.reset}  ${c.yellow}${notHandled.length}${c.reset} event${notHandled.length !== 1 ? "s" : ""} enabled in Stripe but not handled locally`
    );
    log();

    const grouped = groupByCategory(notHandled);
    for (const [category, events] of Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      log(`  ${c.cyan}${c.bold}${category}${c.reset}`);
      for (const e of events) {
        log(`  ${c.yellow}│${c.reset} ${c.dim}○${c.reset}  ${e}`);
      }
      log();
    }

    log(
      `  ${c.gray}Add handlers in ${c.yellow}packages/auth/src/auth.ts${c.gray} or disable in Stripe Dashboard${c.reset}`
    );
    log();
  }

  // ─── Not Enabled ───────────────────────────────────────────────
  if (notEnabled.length > 0) {
    log(
      `  ${c.bgRed}${c.bold}${c.white} ✗ NOT ENABLED ${c.reset}  ${c.red}${notEnabled.length}${c.reset} event${notEnabled.length !== 1 ? "s" : ""} handled locally but not enabled in Stripe`
    );
    log();

    const grouped = groupByCategory(notEnabled);
    for (const [category, events] of Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      log(`  ${c.cyan}${c.bold}${category}${c.reset}`);
      for (const e of events) {
        log(`  ${c.red}│${c.reset} ${c.dim}○${c.reset}  ${e}`);
      }
      log();
    }

    log(
      `  ${c.gray}Enable these in ${c.yellow}Stripe Dashboard → Webhooks${c.gray} or remove handlers from ${c.yellow}packages/auth/src/auth.ts${c.reset}`
    );
    log();
  }

  // ─── Auto-enable missing events ─────────────────────────────────
  if (notEnabled.length > 0 && !hasWildcard) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(
      `  ${c.cyan}Enable them via Stripe API now?${c.reset} [y/N]: `
    );
    rl.close();

    if (answer.trim().toLowerCase() === "y") {
      const nonWildcardEndpoints = endpoints.filter(
        (ep) => !ep.events.includes("*")
      );

      for (const ep of nonWildcardEndpoints) {
        const merged = [...new Set([...ep.events, ...notEnabled])];
        try {
          await stripe.webhookEndpoints.update(ep.id, {
            enabled_events:
              merged as Stripe.WebhookEndpointUpdateParams.EnabledEvent[],
          });
          log(
            `\n  ${c.bgGreen}${c.bold}${c.white} ✓ UPDATED ${c.reset}  Enabled ${c.green}${notEnabled.length}${c.reset} event${notEnabled.length !== 1 ? "s" : ""} on ${c.dim}${ep.url}${c.reset}`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log(
            `\n  ${c.bgRed}${c.bold}${c.white} ✗ FAILED ${c.reset}  ${c.red}${msg}${c.reset} on ${c.dim}${ep.url}${c.reset}`
          );
        }
      }
      log();
      process.exit(0);
    }
    log();
  }

  // ─── All clear ─────────────────────────────────────────────────
  if (!hasIssues) {
    log(
      `  ${c.bgGreen}${c.bold}${c.white} ✓ WEBHOOKS ${c.reset}  All ${c.green}${localEvents.size}${c.reset} events are in sync.\n`
    );
  }

  process.exit(hasIssues ? 1 : 0);
}

main();

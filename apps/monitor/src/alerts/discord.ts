import type { CheckResult, Recovery } from "../types.js";

const RED = 0xe74c3c;
const GREEN = 0x2ecc71;

// Discord embed limits: 25 fields per embed, 1024 chars per field value.
const MAX_FIELDS = 25;

export function humanDuration(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

async function post(env: Env, embed: Record<string, unknown>): Promise<void> {
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
  await res.body?.cancel();
  if (!res.ok) throw new Error(`Discord webhook HTTP ${res.status}`);
}

function failureField(c: CheckResult): { name: string; value: string } {
  const links: string[] = [];
  if (c.dashboardUrl) links.push(`[Open in Coolify](${c.dashboardUrl})`);
  if (c.url) links.push(`[${c.url.startsWith("https://") ? new URL(c.url).host : "Console"}](${c.url})`);
  const lines = [
    `**Error:** ${c.detail ?? "check failed"}`,
    ...(links.length ? [links.join(" · ")] : []),
    ...(c.hint ? [`**Fix:** ${c.hint}`] : []),
  ];
  return { name: `🔴 ${c.name}`, value: lines.join("\n").slice(0, 1024) };
}

export function sendDownDiscord(env: Env, opened: CheckResult[]): Promise<void> {
  return post(env, {
    title: `🔴 ${opened.length} check${opened.length === 1 ? "" : "s"} failing`,
    color: RED,
    fields: opened.slice(0, MAX_FIELDS).map(failureField),
    ...(opened.length > MAX_FIELDS
      ? { description: `…and ${opened.length - MAX_FIELDS} more (see /status)` }
      : {}),
    footer: { text: "Checks run every 10 min · one alert per incident · 🟢 follows on recovery" },
    timestamp: new Date().toISOString(),
  });
}

export function sendRecoveredDiscord(env: Env, recovered: Recovery[]): Promise<void> {
  return post(env, {
    title: `🟢 ${recovered.length} check${recovered.length === 1 ? "" : "s"} recovered`,
    color: GREEN,
    description: recovered
      .map(({ check, downSince }) => `**${check.name}** — was down ${humanDuration(downSince)}`)
      .join("\n"),
    timestamp: new Date().toISOString(),
  });
}

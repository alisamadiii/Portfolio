import type { CheckResult, Recovery } from "../types.js";

const RED = 0xe74c3c;
const GREEN = 0x2ecc71;

async function post(env: Env, embed: Record<string, unknown>): Promise<void> {
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
  await res.body?.cancel();
  if (!res.ok) throw new Error(`Discord webhook HTTP ${res.status}`);
}

export function sendDownDiscord(env: Env, opened: CheckResult[]): Promise<void> {
  return post(env, {
    title: `🔴 ${opened.length} check${opened.length === 1 ? "" : "s"} failing`,
    color: RED,
    description: opened.map((c) => `**${c.name}** — ${c.detail ?? "failed"}`).join("\n"),
    timestamp: new Date().toISOString(),
  });
}

export function sendRecoveredDiscord(env: Env, recovered: Recovery[]): Promise<void> {
  return post(env, {
    title: `🟢 ${recovered.length} check${recovered.length === 1 ? "" : "s"} recovered`,
    color: GREEN,
    description: recovered
      .map(({ check, downSince }) => `**${check.name}** — down since ${downSince}`)
      .join("\n"),
    timestamp: new Date().toISOString(),
  });
}

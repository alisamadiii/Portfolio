import type { ClientRateLimitInfo, Store } from "hono-rate-limiter";

// Workers-KV Store for hono-rate-limiter, replacing the stock WorkersKVStore
// from @hono-rate-limiter/cloudflare. That one writes counters with an
// absolute `expiration` equal to the window end, but KV rejects expirations
// less than 60s in the future — so every hit after the first in a 60s window
// (or in the last minute of a longer one) failed with "KV PUT failed: 400
// Invalid expiration". This store uses expirationTtl clamped to KV's 60s
// minimum instead, and restarts the window itself when the stored resetTime
// has passed (the KV entry can outlive its window by up to that minute).

type Persisted = { totalHits: number; resetTime: string };

export class KvRateStore implements Store {
  private windowMs = 60_000;

  constructor(
    private namespace: KVNamespace,
    readonly prefix = "hrl:"
  ) {}

  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `${this.prefix}${key}`;
  }

  private put(key: string, info: Persisted, now: number): Promise<void> {
    return this.namespace.put(this.key(key), JSON.stringify(info), {
      expirationTtl: Math.max(
        60,
        Math.ceil((Date.parse(info.resetTime) - now) / 1000)
      ),
    });
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const row = await this.namespace.get<Persisted>(this.key(key), "json");
    if (!row) return undefined;
    return { totalHits: row.totalHits, resetTime: new Date(row.resetTime) };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const row = await this.namespace.get<Persisted>(this.key(key), "json");
    const inWindow = row && Date.parse(row.resetTime) > now;
    const info: Persisted = inWindow
      ? { totalHits: row.totalHits + 1, resetTime: row.resetTime }
      : {
          totalHits: 1,
          resetTime: new Date(now + this.windowMs).toISOString(),
        };
    await this.put(key, info, now);
    return { totalHits: info.totalHits, resetTime: new Date(info.resetTime) };
  }

  async decrement(key: string): Promise<void> {
    const now = Date.now();
    const row = await this.namespace.get<Persisted>(this.key(key), "json");
    if (!row) return;
    await this.put(key, { ...row, totalHits: row.totalHits - 1 }, now);
  }

  async resetKey(key: string): Promise<void> {
    await this.namespace.delete(this.key(key));
  }
}

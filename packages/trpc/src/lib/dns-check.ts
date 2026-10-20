import { Resolver } from "node:dns/promises";

/**
 * Friendly DNS diagnostics for the custom-domain Verify flow. Cloudflare's
 * custom-hostname status is the verification AUTHORITY (once the CNAME is live
 * and proxied, public resolvers return Cloudflare edge A records instead of
 * the CNAME, so a CNAME lookup can legitimately come back empty on a working
 * setup). This check only shapes the failure copy: "no record yet" vs "points
 * at the wrong place" vs "replace your A record with a CNAME".
 */

export type CnameCheck = {
  state: "ok" | "wrong_target" | "a_record" | "not_found" | "error";
  value?: string;
};

export interface DnsResolverLike {
  resolveCname(host: string): Promise<string[]>;
  resolve4(host: string): Promise<string[]>;
}

const makeDefaultResolver = (): DnsResolverLike => {
  // Pinned to Cloudflare's resolvers so answers do not depend on the host
  // platform's (possibly stale) local cache.
  const resolver = new Resolver();
  resolver.setServers(["1.1.1.1", "1.0.0.1"]);
  return resolver;
};

const stripDot = (value: string) => value.toLowerCase().replace(/\.$/, "");

const isNoRecordError = (error: unknown) => {
  const code = (error as { code?: string }).code;
  return code === "ENOTFOUND" || code === "ENODATA";
};

export async function checkCname(
  host: string,
  expectedTarget: string,
  resolver: DnsResolverLike = makeDefaultResolver()
): Promise<CnameCheck> {
  try {
    const cnames = await resolver.resolveCname(host);
    const target = cnames[0];
    if (target) {
      return stripDot(target) === stripDot(expectedTarget)
        ? { state: "ok", value: target }
        : { state: "wrong_target", value: target };
    }
  } catch (error) {
    if (!isNoRecordError(error)) return { state: "error" };
  }
  // No CNAME answer: distinguish "A record there instead" from "nothing yet".
  try {
    const addresses = await resolver.resolve4(host);
    if (addresses.length) return { state: "a_record", value: addresses[0] };
  } catch (error) {
    if (!isNoRecordError(error)) return { state: "error" };
  }
  return { state: "not_found" };
}

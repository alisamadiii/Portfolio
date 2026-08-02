import { cacheLife, cacheTag } from "next/cache";
import { TRPCError } from "@trpc/server";

import { stripe } from "@workspace/trpc/lib/stripe";

import { authenticatedProcedure, createTRPCRouter } from "../../init";

// Website info lives as metadata on the Stripe customer, edited directly in
// the dashboard: website_domain (required for a card to show), website_repo
// ("owner/repo", optional), website_label (optional display name).

// Bare host only ("acme.com") — metadata is hand-typed, so tolerate
// "https://acme.com/" etc. Keeps the probe URL and cache tag stable.
const normalizeDomain = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

const checkWebsiteStatus = async (domain: string) => {
  "use cache";
  cacheLife("minutes");
  cacheTag("website-status", `website-status-${domain}`);

  const start = Date.now();
  try {
    // Same 8s budget as the public-URL probe in apps/api/src/lib/verify.ts.
    // < 500 counts as up: auth walls and redirects aren't outages.
    const res = await fetch(`https://${domain}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return {
      up: res.status < 500,
      httpStatus: res.status,
      https: true,
      responseTimeMs: Date.now() - start,
      checkedAt: Date.now(),
    };
  } catch {
    return {
      up: false,
      httpStatus: null,
      https: false,
      responseTimeMs: null,
      checkedAt: Date.now(),
    };
  }
};

const getWebsitesByEmail = async (email: string) => {
  "use cache";
  cacheLife("minutes");
  // Same tag as the customer lookup in stripe/payments.ts, so existing
  // revalidation flows refresh this too.
  cacheTag("stripe", `stripe-customers-${email}`);
  const customers = await stripe.customers.list({ email, limit: 100 });
  return customers.data
    .filter((c) => c.metadata.website_domain)
    .map((c) => ({
      id: c.id,
      domain: normalizeDomain(c.metadata.website_domain),
      githubRepo: c.metadata.website_repo?.trim() || null,
      label: c.metadata.website_label?.trim() || null,
    }));
};

export const websitesRouter = createTRPCRouter({
  getMine: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const sites = await getWebsitesByEmail(ctx.session.user.email);
      return Promise.all(
        sites.map(async (site) => ({
          ...site,
          githubUrl: site.githubRepo
            ? `https://github.com/${site.githubRepo}`
            : null,
          status: await checkWebsiteStatus(site.domain),
        }))
      );
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch websites",
        cause: error,
      });
    }
  }),
});

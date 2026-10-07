import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe,
  MapPin,
  Phone,
  ScanSearch,
  Sparkles,
  Star,
} from "lucide-react";

import { hubSignupUrl, urls } from "@workspace/ui/lib/company";

import { createHttpCaller } from "@workspace/trpc/http-caller";

type Tier = {
  priceId: string;
  amount: number;
  credits: number;
  popular: boolean;
};

// The Lead Finder subscription: one product, one price per monthly tier.
async function getTiers(): Promise<Tier[]> {
  try {
    const httpCaller = createHttpCaller(await headers());
    const products = await httpCaller.payments.getProducts.query();
    const product = products.find(
      (p) =>
        (p.metadata as { project?: string } | null)?.project === "LEADS" &&
        !p.isArchived &&
        p.isRecurring
    );
    if (!product) return [];
    const prices = await httpCaller.payments.getProductPrices.query({
      productId: product.id,
    });
    return prices
      .filter((p) => p.recurringInterval === "month")
      .map((p) => ({
        priceId: p.id,
        amount: p.amount,
        credits: Number((p.metadata as { credits?: string }).credits ?? 0),
        popular:
          (p.metadata as { popular?: string } | null)?.popular === "true",
      }));
  } catch {
    return [];
  }
}

export async function MarketingPage() {
  const tiers = await getTiers();
  const signupUrl = hubSignupUrl(urls.leads);

  return (
    <div className="flex flex-col gap-6">
      <Hero signupUrl={signupUrl} />
      <HowItWorks />
      <Pricing tiers={tiers} signupUrl={signupUrl} />
      <InspectPitch />
    </div>
  );
}

function Hero({ signupUrl }: { signupUrl: string }) {
  return (
    <section className="bg-card rounded-3xl px-6 py-14 text-center shadow-sm sm:px-12 sm:py-20">
      <span className="bg-muted text-muted-foreground mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
        <Sparkles className="size-4" />
        25 free credits on signup, no card required
      </span>
      <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Find local businesses that need a website
      </h1>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg text-balance">
        Scan any niche in any US city. We surface the businesses with no
        website, a dead site, or social media only, complete with phone numbers
        and ratings, so you can pitch them first.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href={signupUrl} className="btn-pill btn-dark">
          Start scanning free
          <ArrowRight />
        </a>
        <Link href="/inspect" className="btn-pill btn-light">
          Try the free site inspector
        </Link>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: MapPin,
    title: "Pick a niche and city",
    body: "Plumbers in Tampa, dentists in Austin, roofers in Phoenix. Any niche, any US city, one click.",
  },
  {
    icon: ScanSearch,
    title: "We scan and verify",
    body: "We pull every operational business from Google Places and check each website live: missing, dead, or social media only.",
  },
  {
    icon: Phone,
    title: "You get scored leads",
    body: "Every prospect comes scored and ready to contact, with phone number, address, rating, and review count.",
  },
];

function HowItWorks() {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <div key={step.title} className="bg-card rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="icon-chip bg-primary/10 text-primary">
              <step.icon />
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              Step {i + 1}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">
            {step.title}
          </h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            {step.body}
          </p>
        </div>
      ))}
    </section>
  );
}

function Pricing({ tiers, signupUrl }: { tiers: Tier[]; signupUrl: string }) {
  return (
    <section className="bg-card rounded-3xl px-6 py-12 shadow-sm sm:px-12">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          One simple monthly plan
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-balance">
          Your credits reset to your plan&apos;s allowance every month. 1
          credit unlocks 1 real prospect: a business with no working website.
          Businesses that already have a healthy site show up free.
        </p>
      </div>
      {tiers.length > 0 && (
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.priceId}
              className={
                tier.popular
                  ? "border-primary relative rounded-2xl border-2 p-6"
                  : "border-border rounded-2xl border p-6"
              }
            >
              {tier.popular && (
                <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-medium">
                  Most popular
                </span>
              )}
              <p className="text-3xl font-semibold tracking-tight">
                ${(tier.amount / 100).toFixed(0)}
                <span className="text-muted-foreground text-base font-normal">
                  /mo
                </span>
              </p>
              <p className="mt-1 font-medium">
                {tier.credits.toLocaleString()} credits every month
              </p>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4 shrink-0" />
                  {(tier.amount / tier.credits)
                    .toFixed(2)
                    .replace(/\.?0+$/, "")}
                  ¢ per lead
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4 shrink-0" />
                  Resets on every billing cycle
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4 shrink-0" />
                  Cancel anytime
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 text-center">
        <a href={signupUrl} className="btn-pill btn-violet">
          Start with 25 free credits
          <ArrowRight />
        </a>
        <p className="text-muted-foreground mt-3 text-sm">
          No card required to try it. Subscribe when you&apos;re ready to
          scale.
        </p>
      </div>
    </section>
  );
}

function InspectPitch() {
  return (
    <section className="bg-card flex flex-col items-center gap-6 rounded-3xl px-6 py-12 shadow-sm sm:flex-row sm:justify-between sm:px-12">
      <div className="max-w-xl">
        <div className="flex items-center gap-3">
          <span className="icon-chip bg-primary/10 text-primary">
            <Globe />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">
            Free site inspector
          </h2>
        </div>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Paste any domain and see every tracking pixel, chat widget, CMS, and
          SEO tag it runs. Perfect for scoping a rebuild before you pitch it.
          Free for everyone, no account needed.
        </p>
      </div>
      <Link href="/inspect" className="btn-pill btn-dark shrink-0">
        Inspect a site
        <Star />
      </Link>
    </section>
  );
}

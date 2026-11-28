"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";

import { PageHeader } from "@/components/ds/layout/page-header";
import { GoogleLogo } from "@/components/ds/brand-logos";
import {
  AppleLogo,
  FacebookLogo,
  GoogleMapsLogo,
  InstagramLogo,
  LinkedInLogo,
  NextdoorLogo,
  OpenAILogo,
  ThumbtackLogo,
  TikTokLogo,
  XLogo,
  YelpLogo,
  YouTubeLogo,
} from "@/components/ds/social-logos";
import { ButtonAnchor, ButtonLink, IconButton } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { IconTile } from "@/components/ds/ui/misc";
import { useProjectId } from "@/components/workspace-provider";
import { appPath } from "@/lib/paths";

/** Where customers look for a local business. */
const CHANNELS: { title: string; text: string; logo: ReactNode }[] = [
  {
    title: "Google search",
    text: "People type what they need and the town they are in. Your site has to answer both.",
    logo: <GoogleLogo className="size-5" />,
  },
  {
    title: "Google Maps",
    text: "The map pack shows three businesses. Google picks the ones it trusts most nearby.",
    logo: <GoogleMapsLogo className="size-5" />,
  },
  {
    title: "AI chats",
    text: "ChatGPT and other assistants recommend businesses they can read about in many places.",
    logo: <OpenAILogo className="size-5" />,
  },
];

/** Profiles whose business details must match the website exactly. */
const PLATFORMS: { name: string; logo: ReactNode }[] = [
  { name: "Google Business Profile", logo: <GoogleLogo className="size-4" /> },
  { name: "Apple Maps", logo: <AppleLogo className="size-4" /> },
  { name: "Facebook", logo: <FacebookLogo className="size-4" /> },
  { name: "Instagram", logo: <InstagramLogo className="size-4" /> },
  { name: "Yelp", logo: <YelpLogo className="size-4" /> },
  { name: "Nextdoor", logo: <NextdoorLogo className="size-4" /> },
  { name: "YouTube", logo: <YouTubeLogo className="size-4" /> },
  { name: "TikTok", logo: <TikTokLogo className="size-4" /> },
  { name: "LinkedIn", logo: <LinkedInLogo className="size-4" /> },
  { name: "X", logo: <XLogo className="size-4" /> },
  { name: "Thumbtack", logo: <ThumbtackLogo className="size-4" /> },
];

type Step = {
  title: string;
  text: string;
  points?: string[];
  extra?: ReactNode;
  link?: { href: string; label: string; logo?: ReactNode };
};

const STEPS: Step[] = [
  {
    title: "Make your business details match everywhere",
    text: "Google, Yelp, Facebook and ChatGPT compare what the internet says about your business. If your name, address or phone differ from one profile to the next, they trust you less and show you less.",
    points: [
      "Use the exact same name, address, phone, hours and website on every profile.",
      "Same spelling, same phone format, same suite number.",
      "Close or fix old listings with an old address or phone.",
    ],
    extra: <PlatformGrid />,
    link: {
      href: "https://www.instagram.com/p/DgJZB-ayBuB/",
      label: "Watch the explainer",
      logo: <InstagramLogo className="size-4" />,
    },
  },
  {
    title: "Give each town you serve its own page",
    text: "One page listing every town you cover does not rank in any of them. Each town needs its own page.",
    points: [
      "Put your service and the town in the main heading, like \"Roof Repair in Orange Park\".",
      "Show a real job you finished nearby, with photos, so people know you work there.",
      "Link each town page from your service page and your footer.",
    ],
    link: {
      href: "https://www.instagram.com/p/DgGUmILuHXs/",
      label: "Watch the explainer",
      logo: <InstagramLogo className="size-4" />,
    },
  },
  {
    title: "Post in local Facebook groups",
    text: "Local groups are where neighbors ask for recommendations. Being there every day brings visits and leads without ads.",
    points: [
      "Join the community groups for each town you serve.",
      "Post 5 to 6 times a day across them: finished jobs, tips, before and after photos.",
      "Answer when someone asks for a recommendation in your trade.",
    ],
  },
  {
    title: "Become a preferred source on Google",
    text: "Google lets people choose sites they want to see more of in Top Stories. Ask happy customers to add your site as a preferred source.",
    link: {
      href: "https://developers.google.com/search/docs/appearance/preferred-sources",
      label: "Read Google's guide",
      logo: <GoogleLogo className="size-4" />,
    },
  },
];

const copy = (text: string) =>
  navigator.clipboard.writeText(text).then(() => toast.success("Copied."));

export function SeoPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="SEO"
        description="How to show up on Google, Google Maps and AI chats like ChatGPT. Work through the checklist below: each step makes it easier for new customers to find you."
      />

      <section className="grid gap-4 md:grid-cols-3">
        {CHANNELS.map((c) => (
          <Card key={c.title} className="flex flex-col gap-3 p-5">
            <IconTile tone="brand" size={40}>
              {c.logo}
            </IconTile>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">{c.title}</h2>
              <p className="text-[13px] leading-relaxed text-dim">{c.text}</p>
            </div>
          </Card>
        ))}
      </section>

      <BusinessDetails />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Your checklist</h2>
          <p className="text-sm text-dim">Start at the top. The first step matters most.</p>
        </div>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <StepCard step={step} n={i + 1} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function StepCard({ step, n }: { step: Step; n: number }) {
  return (
    <Card className="flex flex-col gap-5 p-6 sm:flex-row">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-coral-soft text-sm font-semibold text-coral-deep">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold">{step.title}</h3>
          <p className="max-w-[680px] text-sm leading-relaxed text-ink-3">{step.text}</p>
        </div>
        {step.points && (
          <ul className="flex flex-col gap-2">
            {step.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm text-ink-3">
                <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.2} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        {step.extra}
        {step.link && (
          <ButtonAnchor
            href={step.link.href}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            className="w-fit"
            icon={step.link.logo}
            trailingIcon={<ExternalLink className="size-3.5 text-dim" />}
          >
            {step.link.label}
          </ButtonAnchor>
        )}
      </div>
    </Card>
  );
}

function PlatformGrid() {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[13px] text-dim">Check each profile you have:</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {PLATFORMS.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-2.5 rounded-inner border border-divider bg-sidebar px-3 py-2"
          >
            <IconTile tone="brand" size={32}>
              {p.logo}
            </IconTile>
            <span className="truncate text-[13px] font-medium text-ink-2">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The project's own details from Settings, the exact text every profile should use. */
function BusinessDetails() {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const business = useQuery(trpc.project.business.get.queryOptions({ projectId }));
  const b = business.data;
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Business name", value: b?.name },
    { label: "Phone", value: b?.phone },
    { label: "Address", value: b?.address },
    { label: "Hours", value: b?.hours },
    { label: "Website", value: b?.websiteUrl },
  ];

  return (
    <Card>
      <CardHeader
        title="Your details, word for word"
        divided
        action={
          <ButtonLink href={appPath("settings")} size="sm">
            Edit in Settings
          </ButtonLink>
        }
      />
      <p className="px-6 pt-4 text-[13px] text-dim">
        Copy these onto every profile in step 1 so they match your website exactly.
      </p>
      <dl className="flex flex-col px-6 pb-3 pt-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-4 border-b border-divider py-3 last:border-b-0"
          >
            <dt className="w-32 shrink-0 text-[13px] text-dim">{row.label}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-line text-sm text-ink">
              {business.isPending ? <span className="text-faint">…</span> : row.value || <span className="text-faint">—</span>}
            </dd>
            {row.value && (
              <IconButton aria-label={`Copy ${row.label.toLowerCase()}`} onClick={() => void copy(row.value!)}>
                <Copy className="size-4" />
              </IconButton>
            )}
          </div>
        ))}
      </dl>
    </Card>
  );
}

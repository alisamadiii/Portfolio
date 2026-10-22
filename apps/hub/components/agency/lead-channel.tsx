import { cn } from "@workspace/ui/lib/utils";

import {
  CHANNEL_LABELS,
  CHANNEL_ORDER,
  referrerHost,
} from "@workspace/trpc/lib/agency/lead-channel";
import type {
  AgencyLeadAdClick,
  AgencyLeadChannel,
  AgencyLeadTouch,
} from "@workspace/drizzle/schema";

import { HoverInfo } from "@/components/agency/hover-info";

export { CHANNEL_LABELS, CHANNEL_ORDER };

// What each channel means and how a lead lands in it, in plain words for the
// client. Mirrors the rules in classifyLead (lib/agency/lead-channel.ts).
export const CHANNEL_HELP: Record<
  AgencyLeadChannel,
  { what: string; how: string }
> = {
  google_ads: {
    what: "People who clicked one of your Google Ads before contacting you.",
    how: "Their visit started from a Google Ads click (Google adds a click ID to the link). We remember that click for 90 days, so they still count if they come back later and then fill in the form, the same way Google Ads counts it.",
  },
  paid_other: {
    what: "People who clicked a paid ad somewhere other than Google, like Facebook, Instagram or Bing.",
    how: "The link they clicked was tagged as a paid ad (for example utm_medium=cpc) and didn't come from Google.",
  },
  organic_search: {
    what: "People who found you on Google, Bing or another search engine without clicking an ad. Google Maps and your Business Profile count here too.",
    how: "They arrived from a search engine results page, or from a link tagged as organic.",
  },
  social: {
    what: "People who came from Facebook, Instagram, Nextdoor, Yelp, YouTube or another social site.",
    how: "They arrived from a social site, or from a link tagged as social.",
  },
  email: {
    what: "People who clicked a link in an email or newsletter.",
    how: "The link they clicked was tagged as email, or came from a newsletter tool.",
  },
  referral: {
    what: "People who clicked a link to your site on another website, like a directory, a partner or a review site.",
    how: "They arrived from a website that isn't a search engine or social site, or from a tagged link we don't recognise, like a QR code on a flyer.",
  },
  direct: {
    what: "People who typed your address, used a bookmark, or came from an app that hides where they came from.",
    how: "No ad click, campaign tag or outside website was recorded for their visit.",
  },
  manual: {
    what: "Leads you added yourself, like a phone call or a walk-in.",
    how: "Created with the Add lead button, not through your website.",
  },
};

export function ChannelHelp({ channel }: { channel: AgencyLeadChannel }) {
  return (
    <>
      <p>{CHANNEL_HELP[channel].what}</p>
      <p className="text-muted-foreground">
        <span className="text-foreground font-medium">How we count it: </span>
        {CHANNEL_HELP[channel].how}
      </p>
    </>
  );
}

// Paid channels are warm, free ones cool, manual neutral.
const CHANNEL_TONE: Record<AgencyLeadChannel, string> = {
  google_ads: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  paid_other: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  organic_search: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
  social: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  email: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  referral: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  direct: "bg-muted text-muted-foreground",
  manual: "bg-muted text-muted-foreground",
};

export function ChannelBadge({
  channel,
  className,
  withInfo,
}: {
  channel: AgencyLeadChannel;
  className?: string;
  /** Explain the channel on hover. */
  withInfo?: boolean;
}) {
  if (withInfo) {
    return (
      <HoverInfo
        title={CHANNEL_LABELS[channel]}
        content={<ChannelHelp channel={channel} />}
      >
        <span className="inline-flex cursor-help">
          <ChannelBadge channel={channel} className={className} />
        </span>
      </HoverInfo>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
        CHANNEL_TONE[channel],
        className
      )}
    >
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

/** "/services/brakes" from a full URL, or null. */
export const urlPath = (url: string | null | undefined) => {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    return pathname;
  } catch {
    return null;
  }
};

/** One line under the badge for free channels: the site that sent the visitor. */
export function channelDetail(lead: {
  channel: AgencyLeadChannel;
  utm: { source?: string } | null;
  referrer: string | null;
}) {
  if (["google_ads", "paid_other", "direct", "manual"].includes(lead.channel))
    return null;
  return referrerHost(lead.referrer) ?? lead.utm?.source ?? null;
}

/**
 * The ad campaign behind a lead: Google Ads' own match by click ID first, then
 * the campaign tag on the link. `pending` while the click lookup hasn't run.
 */
export function leadCampaign(lead: {
  channel: AgencyLeadChannel;
  adClick: AgencyLeadAdClick | null;
  adClickCheckedAt: Date | string | null;
  utm: { campaign?: string; term?: string } | null;
}) {
  const name = lead.adClick?.campaignName ?? lead.utm?.campaign ?? null;
  const keyword = lead.adClick?.keyword ?? lead.utm?.term ?? null;
  const state: "found" | "pending" | "missing" | "none" = name
    ? "found"
    : lead.channel !== "google_ads"
      ? "none"
      : lead.adClickCheckedAt
        ? "missing"
        : "pending";
  return { name, keyword, adGroup: lead.adClick?.adGroupName ?? null, state };
}

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  Gauge,
  Globe,
  Home,
  Inbox,
  Rocket,
  Send,
  LayoutGrid,
  Link2,
  Mail,
  Megaphone,
  Plug,
  User,
  Users,
} from "lucide-react";

import { urls } from "@workspace/ui/lib/company";
import type { AppId } from "@workspace/trpc/lib/apps";
import { PLANS, type Feature } from "@workspace/trpc/lib/payment/plans";

import { GoogleAdsLogo, GoogleAnalyticsLogo, ResendLogo } from "@/components/ds/brand-logos";

export type { AppId };

/**
 * ONE registry drives the project sidebar, the Apps page and Home's widgets.
 * Adding an app later = one entry here (+ its id in @workspace/trpc/lib/apps).
 *
 * Booking, chat, calls, ad campaigns and reports live in GoHighLevel, not
 * here. Don't add pages for them.
 */
export type AppDef = {
  id: AppId;
  name: string;
  /** One line, shown on the app card. */
  description: string;
  icon: LucideIcon;
  /** Brand mark for third-party apps (shown on a white tile instead of `icon`). */
  logo?: ComponentType<{ className?: string }>;
  /** Route segment under the project, e.g. /p/[projectId]/leads */
  path: string;
  /** Plan feature that unlocks the app's data. Unset = free on every plan. */
  feature?: Feature;
};

export const APPS: AppDef[] = [
  {
    id: "leads",
    name: "Leads",
    description:
      "Every form and manual lead in one inbox, with where each lead came from.",
    icon: Inbox,
    path: "leads",
    feature: "leads",
  },
  {
    id: "analytics",
    name: "Analytics",
    description:
      "Visitors, sessions and your most-viewed pages from Google Analytics.",
    icon: BarChart3,
    logo: GoogleAnalyticsLogo,
    path: "analytics",
    feature: "analytics",
  },
  {
    id: "google-ads",
    name: "Google Ads",
    description:
      "Spend, campaigns, budget pacing, search terms and conversion tracking for your ads.",
    icon: Megaphone,
    logo: GoogleAdsLogo,
    path: "google-ads",
    feature: "ads",
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description:
      "Email your customers from your own list, with your branding.",
    icon: Mail,
    path: "newsletter",
    feature: "newsletter",
  },
  {
    id: "resend",
    name: "Resend",
    description:
      "Connect the Resend account your website sends email from.",
    icon: Send,
    logo: ResendLogo,
    path: "resend",
  },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

export type AppState = "installed" | "included" | "locked";

export const appState = (
  app: AppDef,
  installed: readonly string[],
  can: (feature: Feature) => boolean
): AppState =>
  installed.includes(app.id)
    ? "installed"
    : !app.feature || can(app.feature)
      ? "included"
      : "locked";

/**
 * What a locked app's button does. The only self-serve plan is website:paid;
 * if that plan doesn't include the feature, upgrading wouldn't unlock it, so
 * the card asks us instead.
 */
export const lockedCta = (app: AppDef): "upgrade" | "ask" =>
  !!app.feature &&
  (PLANS.website.tiers.paid.features as readonly Feature[]).includes(app.feature)
    ? "upgrade"
    : "ask";

export type NavItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Full-color brand mark, rendered instead of `icon`. */
  logo?: ComponentType<{ className?: string }>;
  path: string;
  external?: boolean;
};

/** Project sidebar, top group. Always shown for every client. */
export const PROJECT_CORE: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "" },
  // Opens the AI Canvas editor (unchanged).
  { id: "website", label: "Website", icon: Globe, path: "website" },
  { id: "business-info", label: "Business info", icon: Building2, path: "business-info" },
];

/** Core link shown only once an upload project has published to Netlify. */
export const NETLIFY_NAV: NavItem = { id: "netlify", label: "Netlify", icon: Rocket, path: "netlify" };

/** Who has access to the project. Full-access only (the server 403s anyone else). */
export const MEMBERS_NAV: NavItem = { id: "members", label: "Members", icon: Users, path: "members" };

/** Top sidebar group: core, Members (managers only) below Business info, then Netlify. */
export const projectCoreNav = ({
  netlify,
  members,
}: {
  netlify: boolean;
  members: boolean;
}): NavItem[] => [
  ...PROJECT_CORE,
  ...(members ? [MEMBERS_NAV] : []),
  ...(netlify ? [NETLIFY_NAV] : []),
];

/** Project sidebar, bottom group. Full-access collaborators only. */
export const PROJECT_SETTINGS: NavItem[] = [
  { id: "domain", label: "Domain", icon: Link2, path: "domain" },
  { id: "speed", label: "Speed", icon: Gauge, path: "speed" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "billing" },
];

/** Account-level sidebar (no project selected). */
export const ACCOUNT_NAV: NavItem[] = [
  { id: "sites", label: "Sites", icon: LayoutGrid, path: "/" },
  { id: "account", label: "Account", icon: User, path: "/account" },
  { id: "integrations", label: "Integrations", icon: Plug, path: "/integrations" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "/billing" },
  { id: "guide", label: "Guide", icon: BookOpen, path: "/guide" },
];

export const ACCOUNT_PRODUCTS: NavItem[] = [
  { id: "motion", label: "Motion", path: urls.motion, external: true },
  { id: "purchases", label: "Purchases", path: "/billing?tab=purchases" },
];

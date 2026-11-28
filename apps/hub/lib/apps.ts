import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Code,
  CreditCard,
  Database,
  FileText,
  Gauge,
  Globe,
  Handshake,
  Home,
  Images,
  Inbox,
  LayoutGrid,
  Megaphone,
  MonitorSmartphone,
  Plug,
  ReceiptText,
  Send,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { urls } from "@workspace/ui/lib/company";

import { planAllowsApp, type AppId } from "@workspace/trpc/lib/apps";
import type { Entitlement, Feature } from "@workspace/trpc/lib/payment/plans";

import { docsUrl } from "@/lib/docs-links";

import {
  DoorDashLogo,
  GoogleAdsLogo,
  GoogleAnalyticsLogo,
  GoogleLogo,
  GrubhubLogo,
  NeonLogo,
  NetlifyLogo,
  ResendLogo,
  ShopifyLogo,
  UberEatsLogo,
  WixLogo,
} from "@/components/ds/brand-logos";

export type { AppId };

/**
 * ONE registry drives the project sidebar, the Apps page and Home's widgets.
 * Adding an app later = one entry here (+ its id in @workspace/trpc/lib/apps).
 *
 * Chat, calls, ad campaigns and reports live in GoHighLevel, not here.
 * Don't add pages for them. (Google Calendar is a read-only dashboard of the
 * client's own calendars, not a booking system.)
 */
export type AppDef = {
  id: AppId;
  name: string;
  /** One line, shown on the app card. */
  description: string;
  icon: LucideIcon;
  /** Brand mark for third-party apps (shown on a white tile instead of `icon`). */
  logo?: ComponentType<{ className?: string }>;
  /** Route segment under the project, e.g. /leads */
  path: string;
  /** Plan feature that unlocks the app's data. Unset = free on every plan. */
  feature?: Feature;
  /** Still waiting on the platform's partner approval: the card shows a "Coming soon" badge. */
  comingSoon?: boolean;
};

export const APPS: AppDef[] = [
  {
    id: "leads",
    name: "Leads",
    description:
      "Every form and manual lead in one list, with where each lead came from.",
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
    id: "google-reviews",
    name: "Google Reviews",
    description:
      "Save your Google reviews every day and show the 5-star ones on your website.",
    icon: Star,
    logo: GoogleLogo,
    path: "google-reviews",
  },
  {
    id: "uber-eats",
    name: "Uber Eats",
    description:
      "Your Uber Eats orders and sales in one place, and a Pause button for busy nights.",
    icon: UtensilsCrossed,
    logo: UberEatsLogo,
    path: "uber-eats",
  },
  {
    id: "doordash",
    name: "DoorDash",
    description:
      "Connect your DoorDash store to Client Hub and follow the integration from sign-in to live.",
    icon: UtensilsCrossed,
    logo: DoorDashLogo,
    path: "doordash",
    comingSoon: true,
  },
  {
    id: "grubhub",
    name: "Grubhub",
    description:
      "Grubhub orders in one place: confirm, reject, mark ready, and pause the store on busy nights.",
    icon: UtensilsCrossed,
    logo: GrubhubLogo,
    path: "grubhub",
    comingSoon: true,
  },
  {
    id: "shopify",
    name: "Shopify",
    description:
      "Your Shopify orders and products in one place: ship, cancel, refund, and change prices and stock.",
    icon: ShoppingBag,
    logo: ShopifyLogo,
    path: "shopify",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Connect the Resend account your website sends email from.",
    icon: Send,
    logo: ResendLogo,
    path: "resend",
  },
  {
    id: "neon",
    name: "Neon",
    description:
      "Your Postgres database on Neon: projects, branches and connection strings.",
    icon: Database,
    logo: NeonLogo,
    path: "neon",
  },
  {
    id: "wix",
    name: "Wix",
    description:
      "Manage your Wix site's blog, form leads, contacts, orders and bookings.",
    icon: Globe,
    logo: WixLogo,
    path: "wix",
  },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

export type AppState = "installed" | "included" | "locked";

export const appState = (
  app: AppDef,
  installed: readonly string[],
  entitlement: Pick<Entitlement, "plan" | "features">
): AppState =>
  installed.includes(app.id)
    ? "installed"
    : planAllowsApp(app.id, entitlement)
      ? "included"
      : "locked";

export type NavItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Full-color brand mark, rendered instead of `icon`. */
  logo?: ComponentType<{ className?: string }>;
  /** Our own apps: the icon sits white on a small coral tile, like the Apps page. */
  tile?: boolean;
  path: string;
  external?: boolean;
  /** Admin-only page: the sidebar shows a lock on it. */
  adminOnly?: boolean;
  /** Day the page shipped (YYYY-MM-DD). The sidebar shows "New" for NEW_NAV_DAYS. */
  addedAt?: string;
};

/** How long a page keeps its "New" badge. */
export const NEW_NAV_DAYS = 14;

/** Whether a nav item shipped within the last NEW_NAV_DAYS days. */
export const isNewNav = (addedAt: string | undefined, now: Date = new Date()) => {
  if (!addedAt) return false;
  const added = new Date(`${addedAt}T00:00:00`);
  if (Number.isNaN(added.getTime())) return false;
  const age = now.getTime() - added.getTime();
  return age >= 0 && age < NEW_NAV_DAYS * 24 * 60 * 60 * 1000;
};

/** Project sidebar, top group. Always shown for every client. */
export const PROJECT_CORE: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "" },
  // Opens the AI Canvas editor (unchanged).
  { id: "website", label: "Website", icon: Globe, path: "website" },
  // Uptime, problems, pages and check history from sitewatch.
  {
    id: "site-monitor",
    label: "Site Monitor",
    icon: Activity,
    path: "site-monitor",
    addedAt: "2026-11-20",
  },
  {
    id: "business-info",
    label: "Business info",
    icon: Building2,
    path: "business-info",
  },
  // Appointment templates + "/" snippets with [[placeholders]].
  { id: "templates", label: "Templates", icon: FileText, path: "templates" },
  { id: "seo", label: "SEO", icon: Trophy, path: "seo", addedAt: "2026-11-27" },
];

/** Core link shown only once an upload project has published to Netlify. */
export const NETLIFY_NAV: NavItem = {
  id: "netlify",
  label: "Netlify",
  logo: NetlifyLogo,
  path: "netlify",
};

/** Who has access to the project. Full-access only (the server 403s anyone else). */
export const MEMBERS_NAV: NavItem = {
  id: "members",
  label: "Members",
  icon: Users,
  path: "members",
};
/** Every order in one list; shown once an orders app (Uber Eats, DoorDash, Grubhub, Shopify) is installed. */
export const ORDERS_NAV: NavItem = {
  id: "orders",
  label: "Orders",
  icon: ReceiptText,
  path: "orders",
};

/** Top sidebar group: core, then Members (managers only), Netlify (linked upload sites), Orders (orders apps). */
export const projectCoreNav = ({
  netlify,
  members,
  orders = false,
}: {
  netlify: boolean;
  members: boolean;
  orders?: boolean;
}): NavItem[] => [
  ...PROJECT_CORE,
  ...(members ? [MEMBERS_NAV] : []),
  ...(netlify ? [NETLIFY_NAV] : []),
  ...(orders ? [ORDERS_NAV] : []),
];

/** Project sidebar, bottom group. Full-access collaborators only. */
export const PROJECT_SETTINGS: NavItem[] = [
  { id: "speed", label: "Speed", icon: Gauge, path: "speed" },
  { id: "billing", label: "Billing", icon: CreditCard, path: "billing" },
];

/** Download the site's code. Owner and admins, once Website Setup is paid (admins always). */
export const SOURCE_CODE_NAV: NavItem = {
  id: "source-code",
  label: "Source Code",
  icon: Code,
  path: "source-code",
};

/** Project Settings (name, logo, website, domains, delete). Owner and admins only. */
export const SETTINGS_NAV: NavItem = {
  id: "settings",
  label: "Settings",
  icon: Settings,
  path: "settings",
};

/** Account group of the workspace sidebar (below the project pages). Client websites, Inspirations: admins only. */
export const accountNav = ({ isAdmin }: { isAdmin: boolean }): NavItem[] => [
  { id: "sites", label: "Sites", icon: LayoutGrid, path: "/sites" },
  { id: "account", label: "Account", icon: User, path: "/account" },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    path: "/integrations",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    path: "/account/billing",
  },
  {
    id: "partner",
    label: "Partner Program",
    icon: Handshake,
    path: "/partner",
  },
  // The Client Hub docs live on the agency site only.
  {
    id: "guide",
    label: "Guide",
    icon: BookOpen,
    path: docsUrl("client-hub/getting-started"),
    external: true,
  },
  ...(isAdmin
    ? [
        {
          id: "client-websites",
          label: "Client websites",
          icon: MonitorSmartphone,
          path: "/client-websites",
          adminOnly: true,
        },
        {
          id: "inspirations",
          label: "Inspirations",
          icon: Images,
          path: "/inspirations",
          adminOnly: true,
        },
      ]
    : []),
];

export const ACCOUNT_PRODUCTS: NavItem[] = [
  { id: "motion", label: "Motion", path: urls.motion, external: true },
  {
    id: "purchases",
    label: "Purchases",
    path: "/account/billing?tab=purchases",
  },
];

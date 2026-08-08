"use client";

import {
  ArrowRight,
  CircleCheck,
  CloudUpload,
  Image as ImageIcon,
  MonitorSmartphone,
  MousePointerClick,
  PenLine,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { DocumentTitle } from "@/components/document-title";

/**
 * Client-facing visual guide: how editing, drafts and publishing work.
 * Every "mockup" is a static Tailwind recreation of the real UI so the page
 * always looks like what clients actually see.
 */

// ─── Building blocks ────────────────────────────────────────────

const Section = ({
  step,
  title,
  children,
  mockup,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  mockup: React.ReactNode;
}) => (
  <section className="grid gap-6 md:grid-cols-2 md:items-center">
    <div>
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full text-xs">
          {step}
        </span>
        Step {step}
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight">{title}</h3>
      <div className="text-muted-foreground space-y-2 text-[15px] leading-relaxed">
        {children}
      </div>
    </div>
    <Mockup>{mockup}</Mockup>
  </section>
);

const Mockup = ({ children }: { children: React.ReactNode }) => (
  <div
    aria-hidden
    className="bg-card pointer-events-none select-none rounded-xl border p-5 shadow-sm"
  >
    {children}
  </div>
);

const MockInput = ({
  label,
  value,
  changed,
  previous,
}: {
  label: string;
  value: string;
  changed?: boolean;
  previous?: string;
}) => (
  <div className="space-y-1.5">
    <div className="text-sm font-medium">{label}</div>
    <div
      className={cn(
        changed &&
          "rounded-lg border border-amber-400 bg-amber-400/10 p-1 dark:border-amber-500/60 dark:bg-amber-400/5"
      )}
    >
      <div className="bg-background rounded-md border px-3 py-2 text-sm">
        {value}
      </div>
    </div>
    {previous && (
      <p className="text-muted-foreground text-xs">
        <span className="font-medium text-amber-600 dark:text-amber-500">
          Previous:
        </span>{" "}
        {previous}
      </p>
    )}
  </div>
);

const DraftBadge = () => (
  <Badge className="border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-400">
    Draft
  </Badge>
);

// ─── Page ───────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 pb-20">
      <DocumentTitle title="Guide" />

      {/* Hero + flow diagram */}
      <div>
        <h2 className="text-[27px] font-extrabold tracking-tight">
          How your website editor works
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-[15px] leading-relaxed">
          You edit, you save drafts, you publish when everything looks right.
          Nothing goes live until you press Publish — so you can never break
          your website by experimenting.
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {[
            { icon: PenLine, label: "Edit", sub: "change any text or image" },
            { icon: CircleCheck, label: "Save", sub: "kept as a draft" },
            { icon: CloudUpload, label: "Publish", sub: "review + go live" },
            { icon: MonitorSmartphone, label: "Live", sub: "on your website" },
          ].map((step, index, all) => (
            <div
              key={step.label}
              className="flex flex-1 items-center gap-2"
            >
              <div className="bg-card flex flex-1 items-center gap-3 rounded-xl border p-3.5 shadow-sm">
                <step.icon className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{step.label}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {step.sub}
                  </div>
                </div>
              </div>
              {index < all.length - 1 && (
                <ArrowRight className="text-muted-foreground hidden size-4 shrink-0 sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 1 — find */}
      <Section
        step={1}
        title="Find the page you want to change"
        mockup={
          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <Search className="size-4" />
              Search pages…
              <span className="bg-muted ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold">
                ⌘K
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="bg-muted flex items-center gap-2 rounded-md px-2.5 py-2">
                <MousePointerClick className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">About ›</span>
                <span className="font-medium">Heading</span>
                <span className="text-muted-foreground/70 ml-auto text-xs">
                  Fields
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md px-2.5 py-2">
                <MousePointerClick className="text-muted-foreground size-4" />
                <span className="text-muted-foreground">Home ›</span>
                <span className="font-medium">Hero title</span>
                <span className="text-muted-foreground/70 ml-auto text-xs">
                  Fields
                </span>
              </div>
            </div>
          </div>
        }
      >
        <p>
          Every page of your website is listed in the left sidebar. Click one
          to open it.
        </p>
        <p>
          Even faster: press <b>⌘K</b> (or Ctrl+K) and type what you're looking
          for — like "heading" or "price" — and jump straight to that exact
          field on the right page.
        </p>
      </Section>

      {/* 2 — edit + save */}
      <Section
        step={2}
        title="Edit, then save — it's just a draft"
        mockup={
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" tabIndex={-1}>
                Save
              </Button>
            </div>
            <MockInput
              label="Heading"
              value="Welcome to our new website"
              changed
              previous="Welcome to our website"
            />
            <MockInput label="Subtitle" value="We build great things" />
          </div>
        }
      >
        <p>
          Change any text or image, then press <b>Save</b> (or ⌘S). Your change
          is stored as a <b>draft on your device</b> — your live website
          doesn't change yet.
        </p>
        <p>
          Fields you changed get a <b>yellow highlight</b>, with the previous
          text shown underneath. You can keep editing other pages — all your
          drafts wait for you.
        </p>
      </Section>

      {/* 3 — drafts in lists */}
      <Section
        step={3}
        title="Your drafts are easy to spot"
        mockup={
          <div className="divide-y text-sm">
            <div className="flex items-center gap-2 px-1 py-2.5">
              <span className="font-medium">Our summer story</span>
              <DraftBadge />
              <span className="text-muted-foreground ml-auto text-xs">
                just now
              </span>
            </div>
            <div className="flex items-center gap-2 px-1 py-2.5">
              <span className="font-medium">A day in the workshop</span>
              <DraftBadge />
              <span className="text-muted-foreground ml-auto text-xs">
                Jul 24
              </span>
            </div>
            <div className="flex items-center gap-2 px-1 py-2.5">
              <span className="font-medium">Why we started</span>
              <span className="text-muted-foreground ml-auto text-xs">
                Jul 20
              </span>
            </div>
          </div>
        }
      >
        <p>
          Anything with unpublished changes shows a yellow <b>Draft</b> badge
          in your lists — including brand-new entries that only exist as
          drafts so far.
        </p>
        <p>
          Adding something new? Press <b>New entry</b>{" "}
          <Plus className="inline size-3.5" /> — a window opens, you fill in
          the fields, and the file name is created automatically from the
          title. No technical steps.
        </p>
      </Section>

      {/* 4 — publish */}
      <Section
        step={4}
        title="Publish: review everything, then go live"
        mockup={
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Review changes</div>
              <Button size="sm" tabIndex={-1}>
                Publish
                <span className="bg-primary-foreground/20 ml-1.5 rounded-full px-1.5 text-xs">
                  2
                </span>
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-muted-foreground font-medium">Heading</div>
              <div className="rounded bg-red-500/10 px-2 py-1.5 text-red-700 dark:text-red-400">
                − Welcome to our website
              </div>
              <div className="rounded bg-green-500/10 px-2 py-1.5 text-green-700 dark:text-green-400">
                + Welcome to our new website
              </div>
            </div>
          </div>
        }
      >
        <p>
          When you're happy, press <b>Publish</b>. You'll see every change
          side by side — old text in red, new text in green — across all the
          pages you touched.
        </p>
        <p>
          Confirm, and everything goes live together as <b>one update</b>.
          Your website refreshes itself within a minute or two.
        </p>
      </Section>

      {/* extras */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card rounded-xl border p-5">
          <ImageIcon className="text-muted-foreground mb-3 size-5" />
          <div className="mb-1 text-sm font-semibold">Images & files</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Pick images from the media library or upload new ones right where
            you need them. Uploads are stored immediately so they're ready
            when you publish.
          </p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <Sparkles className="text-muted-foreground mb-3 size-5" />
          <div className="mb-1 text-sm font-semibold">
            Can't break anything
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Drafts live only on your device until you publish, and every
            publish is reviewed by you first. If something looks wrong, just
            discard the draft — the live website is untouched.
          </p>
        </div>
      </section>

      <p className="text-muted-foreground text-sm">
        Stuck or unsure about anything? Just reach out — we're happy to help.
      </p>
    </div>
  );
}

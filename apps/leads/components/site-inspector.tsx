"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BarChart3,
  Copy,
  FileCode2,
  Globe,
  Layers,
  Loader2,
  Megaphone,
  MessageCircle,
  ScanSearch,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@workspace/trpc/client";

type InspectResult = RouterOutputs["leads"]["inspect"];

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; chip: string }
> = {
  tracking: {
    label: "Tracking & ads",
    icon: <BarChart3 />,
    chip: "bg-primary/10 text-primary",
  },
  chat: {
    label: "Chat / customer service",
    icon: <MessageCircle />,
    chip: "bg-emerald-100 text-emerald-600",
  },
  search: {
    label: "Search",
    icon: <Search />,
    chip: "bg-sky-100 text-sky-600",
  },
  marketing: {
    label: "Marketing & embeds",
    icon: <Megaphone />,
    chip: "bg-amber-100 text-amber-600",
  },
};

const copy = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied");
};

// Resolve relative icon paths against the inspected page URL (fallback for
// results produced before the server started resolving them).
function resolveIcons(hrefs: string[], baseUrl: string): string[] {
  return hrefs.map((href) => {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  });
}

// Tiny JSON syntax highlighter — tokenizes with a regex, no library.
const JSON_TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;

const JsonView = ({ code: rawCode }: { code: string }) => {
  // Pretty-print here too, in case the server returned minified JSON.
  let code = rawCode;
  try {
    code = JSON.stringify(JSON.parse(rawCode), null, 2);
  } catch {
    /* not valid JSON (truncated block) — show as-is */
  }

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of code.matchAll(JSON_TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) nodes.push(code.slice(last, index));
    if (m[1] !== undefined) {
      nodes.push(
        m[2] ? (
          <span key={i++}>
            <span className="text-violet-600">{m[1]}</span>
            {m[2]}
          </span>
        ) : (
          <span key={i++} className="text-emerald-600">
            {m[1]}
          </span>
        )
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <span key={i++} className="text-rose-500">
          {m[3]}
        </span>
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <span key={i++} className="text-amber-600">
          {m[4]}
        </span>
      );
    }
    last = index + m[0].length;
  }
  if (last < code.length) nodes.push(code.slice(last));

  return (
    <pre className="bg-muted text-muted-foreground max-h-80 overflow-auto rounded-2xl p-4 pr-12 text-xs leading-relaxed whitespace-pre-wrap">
      {nodes}
    </pre>
  );
};

const CopyBtn = ({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) => (
  <button
    type="button"
    onClick={() => copy(text)}
    className={`text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${className}`}
    title="Copy"
  >
    <Copy className="size-3.5" />
  </button>
);

const Section = ({
  icon,
  chip,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  chip: string;
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="bg-card rounded-3xl p-6 shadow-sm sm:p-7">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`icon-chip ${chip}`}>{icon}</span>
        <h2 className="font-semibold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
    {children}
  </section>
);

export const SiteInspector = () => {
  const trpc = useTRPC();
  const [domain, setDomain] = useState("");

  const inspect = useMutation(trpc.leads.inspect.mutationOptions());
  const result = inspect.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inspect.mutate(
      { domain },
      { onError: (error) => toast.error(error.message) }
    );
  };

  return (
    <div className="space-y-6">
      <Section
        icon={<ScanSearch />}
        chip="bg-primary/10 text-primary"
        title={
          <>
            Site Inspector
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              scripts, pixels & SEO of an existing site
            </span>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Client domain (e.g. clientsite.com)"
            required
            minLength={3}
            className="input-pill flex-1"
          />
          <button
            type="submit"
            className="btn-pill btn-dark"
            disabled={inspect.isPending}
          >
            {inspect.isPending ? <Loader2 className="animate-spin" /> : <Globe />}
            Inspect
          </button>
        </form>
        <p className="text-muted-foreground mt-3 text-sm">
          Fetches the site&apos;s HTML and lists every tracking script, chat
          widget, embed, and platform it uses — with the original snippets
          ready to copy into the rebuilt site. Static HTML only: scripts
          injected by Google Tag Manager won&apos;t show individually, but the
          GTM container ID will (porting the container carries them along).
        </p>
        {result && <QuickSummary result={result} />}
      </Section>

      {result && <InspectorResults result={result} />}
    </div>
  );
};

// At-a-glance chips under the inspect form — detail lives in the cards below.
const QuickSummary = ({ result }: { result: InspectResult }) => {
  const find = (name: string) =>
    result.findings.find((f) => f.name.startsWith(name));

  const yes = "bg-emerald-100 text-emerald-700";
  const no = "bg-muted text-muted-foreground";
  const chip = (
    label: string,
    present: boolean,
    detail?: string
  ): { label: string; present: boolean; detail?: string } => ({
    label,
    present,
    detail,
  });

  const seo = result.seo;
  const chatVendors = result.findings
    .filter((f) => f.category === "chat")
    .map((f) => f.name);
  const stack = result.findings
    .filter((f) => f.category === "platform" || f.category === "framework")
    .map((f) => f.name.replace(" (likely)", ""));
  const unknown = result.scripts.filter((s) => !s.vendor).length;

  const chips = [
    chip(
      "SEO meta",
      !!(seo.title && seo.description),
      seo.title && seo.description
        ? undefined
        : seo.title
          ? "no description"
          : "missing"
    ),
    chip("Open Graph", seo.og.length > 0),
    chip("JSON-LD", seo.jsonLd.length > 0, seo.jsonLd.length ? `${seo.jsonLd.length}` : undefined),
    chip("Google Analytics", !!find("Google Analytics"), find("Google Analytics")?.ids[0]),
    chip("Tag Manager", !!find("Google Tag Manager"), find("Google Tag Manager")?.ids[0]),
    chip("Meta Pixel", !!find("Meta Pixel"), find("Meta Pixel")?.ids[0]),
    chip("Google Ads", !!find("Google Ads")),
    chip("Chat widget", chatVendors.length > 0, chatVendors[0]),
  ];

  return (
    <div className="border-border mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {stack.length > 0 && (
          <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-medium">
            {stack.join(" · ")}
          </span>
        )}
        {chips.map((c) => (
          <span
            key={c.label}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${c.present ? yes : no}`}
          >
            {c.present ? "✓" : "—"} {c.label}
            {c.detail ? ` · ${c.detail}` : ""}
          </span>
        ))}
        <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 text-xs font-medium">
          {result.scripts.length} scripts
          {unknown ? ` · ${unknown} unknown` : ""}
        </span>
      </div>
    </div>
  );
};

const InspectorResults = ({ result }: { result: InspectResult }) => {
  const stack = result.findings.filter(
    (f) => f.category === "platform" || f.category === "framework"
  );
  const unknownScripts = result.scripts.filter((s) => !s.vendor).length;

  return (
    <>
      <Section
        icon={<Layers />}
        chip="bg-violet-100 text-violet-600"
        title={
          <>
            {result.finalUrl}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              (HTTP {result.status})
            </span>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {result.generator && (
            <span className="bg-muted rounded-full px-3 py-1.5 text-xs font-medium">
              Generator: {result.generator}
            </span>
          )}
          {stack.length ? (
            stack.map((f) => (
              <span
                key={f.name}
                className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {f.name}
                {f.ids.length ? ` — ${f.ids.join(", ")}` : ""}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">
              No platform/framework detected.
            </span>
          )}
        </div>
      </Section>

      <SeoSection seo={result.seo} finalUrl={result.finalUrl} />

      {Object.entries(CATEGORY_META).map(([category, meta]) => {
        const items = result.findings.filter((f) => f.category === category);
        return (
          <Section
            key={category}
            icon={meta.icon}
            chip={meta.chip}
            title={meta.label}
          >
            {!items.length ? (
              <p className="text-muted-foreground text-sm">Nothing detected.</p>
            ) : (
              <div className="space-y-5">
                {items.map((f) => (
                  <div key={f.name} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{f.name}</span>
                      {f.ids.map((id) => (
                        <button
                          key={id}
                          onClick={() => copy(id)}
                          title="Click to copy"
                          className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-xs font-medium transition-opacity hover:opacity-75 ${meta.chip}`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                    {f.evidence.map((snippet, i) => (
                      <div key={i} className="relative">
                        <pre className="bg-muted max-h-48 overflow-auto rounded-2xl p-4 pr-12 text-xs whitespace-pre-wrap">
                          {snippet}
                        </pre>
                        <CopyBtn
                          text={snippet}
                          className="bg-card absolute top-2 right-2 shadow-xs"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })}

      <Section
        icon={<FileCode2 />}
        chip="bg-rose-100 text-rose-600"
        title={
          <>
            All external scripts ({result.scripts.length})
            {unknownScripts > 0 && (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {unknownScripts} unrecognized — review manually
              </span>
            )}
          </>
        }
      >
        <UrlTable rows={result.scripts} />
      </Section>

      {result.iframes.length > 0 && (
        <Section
          icon={<Globe />}
          chip="bg-sky-100 text-sky-600"
          title={`Iframes (${result.iframes.length})`}
        >
          <UrlTable rows={result.iframes} />
        </Section>
      )}
    </>
  );
};

const SeoRow = ({
  label,
  value,
  count,
}: {
  label: string;
  value: string | null;
  count?: boolean;
}) => (
  <TableRow>
    <TableCell className="text-muted-foreground w-36 align-top text-xs whitespace-nowrap">
      {label}
      {count && value ? <span className="ml-1">({value.length})</span> : null}
    </TableCell>
    <TableCell className="text-sm break-words whitespace-normal">
      {value ?? <span className="text-muted-foreground">—</span>}
    </TableCell>
    <TableCell className="w-12 align-top">
      {value && <CopyBtn text={value} />}
    </TableCell>
  </TableRow>
);

const MetaTable = ({ rows }: { rows: { key: string; content: string }[] }) => (
  <Table>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.key + row.content}>
          <TableCell className="text-muted-foreground w-44 align-top font-mono text-xs whitespace-nowrap">
            {row.key}
          </TableCell>
          <TableCell className="text-sm break-words whitespace-normal">
            {row.content}
          </TableCell>
          <TableCell className="w-12">
            <CopyBtn text={row.content} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const SeoSection = ({
  seo,
  finalUrl,
}: {
  seo: InspectResult["seo"];
  finalUrl: string;
}) => {
  return (
    <Section
      icon={<Search />}
      chip="bg-teal-100 text-teal-600"
      title="SEO & head"
      right={
        <button
          className="btn-pill btn-light h-9 px-4 text-sm [&_svg]:size-4"
          onClick={() => copy(seo.rawHead)}
        >
          <Copy /> Copy raw &lt;head&gt;
        </button>
      }
    >
      <div className="space-y-5">
        <Table>
          <TableBody>
            <SeoRow label="Title" value={seo.title} count />
            <SeoRow label="Description" value={seo.description} count />
            <SeoRow label="Canonical" value={seo.canonical} />
            <SeoRow label="Robots" value={seo.robots} />
            <SeoRow label="Keywords" value={seo.keywords} />
          </TableBody>
        </Table>

        {seo.og.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Open Graph</p>
            <MetaTable
              rows={seo.og.map((m) => ({ key: m.property, content: m.content }))}
            />
          </div>
        )}

        {seo.twitter.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Twitter</p>
            <MetaTable
              rows={seo.twitter.map((m) => ({ key: m.name, content: m.content }))}
            />
          </div>
        )}

        {seo.jsonLd.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Structured data (JSON-LD) — {seo.jsonLd.length} block
              {seo.jsonLd.length > 1 ? "s" : ""}
            </p>
            {seo.jsonLd.map((block, i) => (
              <div key={i} className="relative">
                <div className="mb-1 flex flex-wrap gap-1">
                  {block.types.length ? (
                    block.types.map((t) => (
                      <span
                        key={t}
                        className="bg-teal-100 text-teal-700 rounded-full px-2.5 py-1 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                      unknown type
                    </span>
                  )}
                </div>
                <JsonView code={block.raw} />
                <CopyBtn
                  text={block.raw}
                  className="bg-card absolute top-9 right-2 shadow-xs"
                />
              </div>
            ))}
          </div>
        )}

        {seo.favicons.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">
              Icons ({seo.favicons.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {resolveIcons(seo.favicons, finalUrl).map((href) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={href}
                  className="bg-muted hover:bg-muted/70 flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={href}
                    alt=""
                    className="bg-card size-6 rounded-md object-contain p-0.5"
                    loading="lazy"
                  />
                  <span className="text-muted-foreground max-w-56 truncate font-mono text-xs">
                    {href.split("/").pop() || href}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {seo.hreflang.length > 0 && (
          <p className="text-muted-foreground break-all text-xs">
            Hreflang:{" "}
            {seo.hreflang.map((h) => `${h.lang} → ${h.href}`).join(" · ")}
          </p>
        )}
      </div>
    </Section>
  );
};

const UrlTable = ({
  rows,
}: {
  rows: { src: string; vendor: string | null }[];
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>URL</TableHead>
        <TableHead className="w-44">Vendor</TableHead>
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row, i) => (
        <TableRow key={i}>
          <TableCell className="max-w-xl truncate font-mono text-xs">
            {row.src}
          </TableCell>
          <TableCell>
            {row.vendor ? (
              <span className="bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                {row.vendor}
              </span>
            ) : (
              <span className="bg-rose-100 text-rose-600 rounded-full px-2.5 py-1 text-xs font-medium">
                Unknown
              </span>
            )}
          </TableCell>
          <TableCell>
            <CopyBtn text={row.src} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

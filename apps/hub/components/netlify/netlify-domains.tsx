"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Check, Copy, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { normalizeDomain } from "@workspace/trpc/lib/netlify-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input } from "@/components/ds/ui/field";
import { useRouteProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

type Pending =
  | { kind: "primary"; domain: string | null }
  | { kind: "add-alias"; domain: string }
  | { kind: "remove-alias"; domain: string }
  | { kind: "https" }
  | { kind: "force"; on: boolean };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="grid size-7 place-items-center rounded-control text-dim hover:bg-canvas hover:text-ink"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** Custom domain, aliases, the DNS records to set, and HTTPS. */
export function NetlifyDomains({ canEdit }: { canEdit: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const domains = useQuery(trpc.netlify.domains.queryOptions({ projectId }, { retry: false }));
  const [primary, setPrimary] = useState("");
  const [alias, setAlias] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  const done = (message: string) => () => {
    toast.success(message);
    setPending(null);
    void queryClient.invalidateQueries({ queryKey: trpc.netlify.pathKey() });
  };
  const fail = (fallback: string) => (error: unknown) =>
    toast.error(handleCmsError(error, fallback));

  const setCustom = useMutation(
    trpc.netlify.setCustomDomain.mutationOptions({
      onSuccess: done("Domain saved on Netlify."),
      onError: fail("Couldn't save the domain."),
    })
  );
  const addAlias = useMutation(
    trpc.netlify.addAlias.mutationOptions({
      onSuccess: () => {
        setAlias("");
        done("Domain alias added.")();
      },
      onError: fail("Couldn't add the alias."),
    })
  );
  const removeAlias = useMutation(
    trpc.netlify.removeAlias.mutationOptions({
      onSuccess: done("Domain alias removed."),
      onError: fail("Couldn't remove the alias."),
    })
  );
  const https = useMutation(
    trpc.netlify.provisionHttps.mutationOptions({
      onSuccess: done("Certificate requested. It can take a few minutes."),
      onError: fail("Couldn't set up HTTPS."),
    })
  );
  const force = useMutation(
    trpc.netlify.setForceHttps.mutationOptions({
      onSuccess: done("Saved."),
      onError: fail("Couldn't change HTTPS redirects."),
    })
  );

  if (domains.isPending) return <Skeleton className="h-[320px] rounded-card" />;
  if (domains.isError) {
    return (
      <Card className="px-6 py-6 text-[13px] text-dim">
        {handleCmsError(domains.error, "Couldn't load domains from Netlify.")}
      </Card>
    );
  }
  const d = domains.data;
  const primaryValid = normalizeDomain(primary);
  const aliasValid = normalizeDomain(alias);
  const busy =
    setCustom.isPending || addAlias.isPending || removeAlias.isPending || https.isPending || force.isPending;

  const confirmCopy = (() => {
    if (!pending) return null;
    switch (pending.kind) {
      case "primary":
        return pending.domain
          ? {
              title: `Use ${pending.domain}?`,
              description: d.customDomain
                ? `It replaces ${d.customDomain} as the site's main domain. Then point the domain at Netlify with the DNS record shown below.`
                : "Then point the domain at Netlify with the DNS record shown below.",
              label: "Save domain",
              danger: false,
              run: () => setCustom.mutate({ projectId, domain: pending.domain }),
            }
          : {
              title: `Remove ${d.customDomain}?`,
              description: `Your site stays live at ${d.netlifyHost}, but ${d.customDomain} stops pointing to it.`,
              label: "Remove domain",
              danger: true,
              run: () => setCustom.mutate({ projectId, domain: null }),
            };
      case "add-alias":
        return {
          title: `Add ${pending.domain}?`,
          description: "It serves the same site. Point it at Netlify with the DNS record shown below.",
          label: "Add alias",
          danger: false,
          run: () => addAlias.mutate({ projectId, domain: pending.domain }),
        };
      case "remove-alias":
        return {
          title: `Remove ${pending.domain}?`,
          description: "That domain stops showing your site.",
          label: "Remove alias",
          danger: true,
          run: () => removeAlias.mutate({ projectId, domain: pending.domain }),
        };
      case "https":
        return {
          title: "Set up HTTPS?",
          description: "Netlify requests a free Let's Encrypt certificate for your domains. Your DNS records must already point to Netlify.",
          label: "Set up HTTPS",
          danger: false,
          run: () => https.mutate({ projectId }),
        };
      case "force":
        return {
          title: pending.on ? "Always use HTTPS?" : "Stop forcing HTTPS?",
          description: pending.on
            ? "Visitors on http:// are redirected to https:// automatically."
            : "Visitors can open the site over plain http:// again.",
          label: pending.on ? "Turn on" : "Turn off",
          danger: !pending.on,
          run: () => force.mutate({ projectId, on: pending.on }),
        };
    }
  })();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Domains" divided />
        <div className="flex flex-col gap-5 px-6 py-5">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink">Main domain</span>
            {d.customDomain ? (
              <div className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5 text-[14px]">
                <a href={`https://${d.customDomain}`} target="_blank" rel="noreferrer" className="font-medium text-coral-text hover:underline">
                  {d.customDomain}
                </a>
                {canEdit && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending({ kind: "primary", domain: null })}>
                    Remove
                  </Button>
                )}
              </div>
            ) : canEdit ? (
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (primaryValid) setPending({ kind: "primary", domain: primaryValid });
                }}
              >
                <Field label="Domain" className="min-w-[240px] flex-1">
                  <Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="example.com" maxLength={253} />
                </Field>
                <Button type="submit" variant="primary" disabled={!primaryValid || busy}>
                  Add domain
                </Button>
              </form>
            ) : (
              <p className="text-[14px] text-dim">No custom domain yet. The site is live at {d.netlifyHost}.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink">Other domains (aliases)</span>
            {d.aliases.length === 0 && <p className="text-[13px] text-dim">None.</p>}
            {d.aliases.map((a) => (
              <div key={a} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-[14px]">
                <span className="text-ink">{a}</span>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Remove ${a}`}
                    disabled={busy}
                    onClick={() => setPending({ kind: "remove-alias", domain: a })}
                    className="grid size-7 place-items-center rounded-control text-dim hover:bg-canvas hover:text-ink"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && d.customDomain && (
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (aliasValid) setPending({ kind: "add-alias", domain: aliasValid });
                }}
              >
                <Input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={`www.${d.customDomain.replace(/^www\./, "")}`}
                  maxLength={253}
                  className="min-w-[240px] flex-1"
                />
                <Button type="submit" icon={<Plus className="size-4" />} disabled={!aliasValid || busy}>
                  Add alias
                </Button>
              </form>
            )}
          </div>
        </div>
      </Card>

      {d.records.length > 0 && (
        <Card>
          <CardHeader title="DNS records to set" divided />
          <p className="px-6 pt-4 text-[13px] leading-normal text-dim">
            Add these at the company where you bought the domain (GoDaddy, Namecheap, Cloudflare…). Changes can take
            up to a few hours.
          </p>
          <div className="overflow-x-auto px-6 py-4">
            <div className="flex min-w-[520px] flex-col divide-y divide-divider rounded-control border border-line text-[13px]">
              <div className="grid grid-cols-[1.4fr_70px_1fr_1.6fr] gap-3 bg-sidebar px-3 py-2 text-[12px] text-faint">
                <span>Domain</span>
                <span>Type</span>
                <span>Name</span>
                <span>Value</span>
              </div>
              {d.records.map((r) => (
                <div key={r.domain} className="grid grid-cols-[1.4fr_70px_1fr_1.6fr] items-center gap-3 px-3 py-2">
                  <span className="truncate text-ink">{r.domain}</span>
                  <span className="font-medium text-ink">{r.type}</span>
                  <span className="flex items-center gap-1 font-mono text-ink-3">
                    {r.name}
                    <CopyButton value={r.name} />
                  </span>
                  <span className="flex min-w-0 items-center gap-1 font-mono text-ink-3">
                    <span className="truncate">{r.value}</span>
                    <CopyButton value={r.value} />
                  </span>
                </div>
              ))}
            </div>
            {d.nameservers.length > 0 && (
              <p className="mt-3 text-[13px] text-dim">
                Using Netlify DNS instead? Set these nameservers: {d.nameservers.join(", ")}
              </p>
            )}
            {d.dnsErrors.length > 0 && (
              <p className="mt-2 text-[13px] text-coral-text">{d.dnsErrors.join(" ")}</p>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="HTTPS" divided />
        <div className="flex flex-col gap-4 px-6 py-5 text-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink">
              <Lock className="size-4 text-dim" />
              Certificate
            </span>
            {d.certificate ? (
              <span className="flex items-center gap-2">
                <Badge tone={d.certificate.state === "issued" ? "success" : "info"} dot>
                  {d.certificate.state === "issued" ? "Active" : d.certificate.state}
                </Badge>
                {d.certificate.expiresAt && (
                  <span className="text-[13px] text-dim">
                    Renews automatically · expires {format(parseISO(d.certificate.expiresAt), "MMM d, yyyy")}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <Badge tone="neutral">{d.ssl ? "Netlify subdomain only" : "Not set up"}</Badge>
                {canEdit && d.customDomain && (
                  <Button size="sm" variant="primary" disabled={busy} onClick={() => setPending({ kind: "https" })}>
                    Set up HTTPS
                  </Button>
                )}
              </span>
            )}
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-ink">Always use HTTPS</span>
              <span className="text-[13px] text-dim">Redirect http:// visitors to https://.</span>
            </span>
            <input
              type="checkbox"
              checked={d.forceSsl}
              disabled={!canEdit || busy}
              onChange={(e) => setPending({ kind: "force", on: e.target.checked })}
              className="size-4 accent-coral"
            />
          </label>
        </div>
      </Card>

      {confirmCopy && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.label}
          danger={confirmCopy.danger}
          onConfirm={confirmCopy.run}
        />
      )}
    </div>
  );
}

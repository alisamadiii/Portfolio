"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { useConfig } from "@/contexts/config-context";
import { Check, Copy, Globe } from "@/components/icon";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";

/** Site Settings › Domain. GitHub projects keep the plain Website URL field;
 * uploaded projects get the free subdomain + custom domain flow. */
export function DomainPanel() {
  const trpc = useTRPC();
  const { config } = useConfig();
  const repoId = config?.repoId ?? 0;

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions({ repoId }, { enabled: !!repoId })
  );

  if (!snapshot.data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    );
  }
  if (snapshot.data.source === "upload") {
    return <UploadDomainPanel repoId={repoId} />;
  }
  return <GithubDomainPanel repoId={repoId} current={snapshot.data.websiteUrl ?? ""} />;
}

// ─── GitHub projects: plain Website URL (behavior unchanged) ─────────────────

function GithubDomainPanel({
  repoId,
  current,
}: {
  repoId: number;
  current: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  useEffect(() => setValue(current), [current]);

  const save = useMutation(
    trpc.project.setWebsiteUrl.mutationOptions({
      onSuccess: async () => {
        toast.success("Website URL saved.");
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-1.5 flex items-center gap-2">
        <Globe className="size-5" />
        <h2 className="text-lg font-semibold tracking-tight">Domain</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Your site's live website URL. It's shown across the hub and used for the
        canvas preview and the SEO base URL.
      </p>

      <div className="max-w-md space-y-1.5">
        <Label htmlFor="website-url">Website URL</Label>
        <Input
          id="website-url"
          placeholder="example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() !== current.trim()) {
              save.mutate({ repoId, websiteUrl: value });
            }
          }}
        />
        <p className="text-muted-foreground text-[12.5px]">
          Enter a domain like <span className="font-medium">example.com</span> —
          we'll store it as <span className="font-medium">https://…</span>.
        </p>
      </div>

      <div className="mt-5 max-w-md">
        <Button
          isLoading={save.isPending}
          disabled={value.trim() === current.trim()}
          onClick={() => save.mutate({ repoId, websiteUrl: value })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Uploaded projects: free subdomain + custom domain ───────────────────────

const CopyChip = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1 transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <Check className="text-status-success size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
};

const statusBadge = (status: "pending" | "active") =>
  status === "active" ? (
    <Badge className="bg-status-success/15 text-status-success rounded-full px-2 py-0.5 text-[11px] font-semibold">
      Verified
    </Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
      Pending
    </Badge>
  );

function UploadDomainPanel({ repoId }: { repoId: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();

  const status = useQuery(
    trpc.domains.status.queryOptions(
      { repoId },
      {
        enabled: !!repoId,
        refetchInterval: (query) =>
          query.state.data?.custom?.status === "pending" ? 30_000 : false,
      }
    )
  );

  const afterChange = async () => {
    clearWebsiteUrlCache(config?.owner, config?.repo);
    await queryClient.invalidateQueries();
  };

  const [slugInput, setSlugInput] = useState("");
  useEffect(() => {
    setSlugInput(status.data?.free?.slug ?? "");
  }, [status.data?.free?.slug]);
  const [domainInput, setDomainInput] = useState("");

  const setSlug = useMutation(
    trpc.domains.setFreeSubdomain.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          "url" in result && result.url
            ? `Your site is live at ${result.url}`
            : "Subdomain removed."
        );
        await afterChange();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const addDomain = useMutation(
    trpc.domains.addCustomDomain.mutationOptions({
      onSuccess: async () => {
        setDomainInput("");
        await afterChange();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const verifyDomain = useMutation(
    trpc.domains.verifyCustomDomain.mutationOptions({
      onSuccess: async (result) => {
        if (result.verified) {
          toast.success("Domain verified. Your site is live on it.");
        } else if (result.dns === "not_found") {
          toast.info(
            "We could not find your CNAME record yet. DNS changes can take up to an hour."
          );
        } else if (result.dns === "wrong_target") {
          toast.info("Your CNAME points somewhere else. Check the value below.");
        } else if (result.dns === "a_record") {
          toast.info(
            "We found an A record on that name. Replace it with the CNAME below."
          );
        } else {
          toast.info(
            "Record found. The certificate is still being issued, try again in a minute."
          );
        }
        await afterChange();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const removeDomain = useMutation(
    trpc.domains.removeCustomDomain.mutationOptions({
      onSuccess: async () => {
        toast.success("Domain removed.");
        await afterChange();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const data = status.data;
  const busy =
    setSlug.isPending ||
    addDomain.isPending ||
    verifyDomain.isPending ||
    removeDomain.isPending;

  return (
    <div className="mx-auto w-full max-w-screen-md p-6">
      <div className="mb-1.5 flex items-center gap-2">
        <Globe className="size-5" />
        <h2 className="text-lg font-semibold tracking-tight">Domain</h2>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Your site is always online. Give it a nicer address with a free
        subdomain, or connect your own domain.
      </p>

      {!data ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Free subdomain */}
          <section className="max-w-md space-y-1.5">
            <Label htmlFor="free-subdomain">Free subdomain</Label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center">
                <Input
                  id="free-subdomain"
                  placeholder="my-site"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  className="rounded-r-none"
                />
                <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-r-md border border-l-0 px-3 text-sm">
                  .{data.baseDomain}
                </span>
              </div>
              <Button
                isLoading={setSlug.isPending}
                disabled={
                  busy || slugInput.trim() === (data.free?.slug ?? "")
                }
                onClick={() => setSlug.mutate({ repoId, slug: slugInput })}
              >
                Save
              </Button>
            </div>
            {data.free ? (
              <p className="text-muted-foreground text-[12.5px]">
                Live at{" "}
                <a
                  href={data.free.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  {data.free.url}
                </a>
              </p>
            ) : (
              <p className="text-muted-foreground text-[12.5px]">
                Pick a name and your site is live at it instantly. No DNS setup
                needed.
              </p>
            )}
          </section>

          {/* Custom domain */}
          <ProjectFeatureGate feature="Custom domain">
            <section className="max-w-xl space-y-3">
              <Label>Custom domain</Label>
              {!data.custom ? (
                <>
                  <div className="flex max-w-md items-center gap-2">
                    <Input
                      placeholder="www.yourdomain.com"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                    />
                    <Button
                      isLoading={addDomain.isPending}
                      disabled={busy || !domainInput.trim() || !data.customDomainsConfigured}
                      onClick={() =>
                        addDomain.mutate({ repoId, domain: domainInput })
                      }
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-[12.5px]">
                    Enter a subdomain like{" "}
                    <span className="font-medium">www.yourdomain.com</span>.
                    Root domains are not supported yet. Set up a redirect from
                    your root domain to www at your registrar.
                  </p>
                  {!data.customDomainsConfigured && (
                    <p className="text-muted-foreground text-[12.5px]">
                      Custom domains are not configured on this server.
                    </p>
                  )}
                </>
              ) : (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">
                      {data.custom.domain}
                    </span>
                    {statusBadge(data.custom.status)}
                  </div>

                  {data.custom.status === "pending" && (
                    <>
                      <p className="text-muted-foreground mt-3 text-[12.5px]">
                        Add this record at your DNS provider (Namecheap,
                        GoDaddy, or wherever your domain lives), then verify.
                        DNS changes can take up to an hour.
                      </p>
                      <div className="bg-muted/50 mt-2 grid grid-cols-[auto_1fr_1fr] items-center gap-x-4 gap-y-1 rounded-md p-3 text-[12.5px]">
                        <span className="text-muted-foreground font-medium">
                          Type
                        </span>
                        <span className="text-muted-foreground font-medium">
                          Name
                        </span>
                        <span className="text-muted-foreground font-medium">
                          Value
                        </span>
                        <span className="font-mono">{data.custom.dns.type}</span>
                        <span className="flex min-w-0 items-center gap-1 font-mono">
                          <span className="truncate">{data.custom.dns.name}</span>
                          <CopyChip value={data.custom.dns.name} />
                        </span>
                        <span className="flex min-w-0 items-center gap-1 font-mono">
                          <span className="truncate">{data.custom.dns.value}</span>
                          <CopyChip value={data.custom.dns.value} />
                        </span>
                      </div>
                    </>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    {data.custom.status === "pending" && (
                      <Button
                        size="sm"
                        isLoading={verifyDomain.isPending}
                        disabled={busy}
                        onClick={() => verifyDomain.mutate({ repoId })}
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={removeDomain.isPending}
                      disabled={busy}
                      onClick={() => removeDomain.mutate({ repoId })}
                    >
                      {data.custom.status === "pending" ? "Cancel" : "Remove"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </ProjectFeatureGate>
        </div>
      )}
    </div>
  );
}

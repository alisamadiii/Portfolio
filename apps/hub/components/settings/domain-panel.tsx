"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import {
  HOSTING_LABELS,
  HOSTING_VALUES,
  isExternalHosting,
  type Hosting,
} from "@workspace/trpc/lib/hosting";

import { isAdminUser } from "@/lib/authz-shared";
import { clearWebsiteUrlCache } from "@/hooks/use-website-url";

import { Check, Copy } from "@/components/icon";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";

/** Site Settings › Domain. Content Pilot hosted projects (the default, and
 * every upload) get the free subdomain + custom domain flow. Projects hosted
 * on Netlify/Vercel/Cloudflare manage their domain there, so they get a note
 * instead. Only the project owner or an admin can change where it's hosted. */
export function DomainPanel() {
  const trpc = useTRPC();
  const { config } = useConfig();
  const { user } = useUser();
  const isAdmin = isAdminUser(user);
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

  const { hosting, source, websiteUrl, isOwner } = snapshot.data;
  // Everyone sees where the site is hosted; the owner or an admin can change it.
  const hostingCard = (
    <HostingCard
      repoId={repoId}
      hosting={hosting}
      websiteUrl={websiteUrl}
      canHostElsewhere={source === "github"}
      canEdit={isAdmin || isOwner}
    />
  );

  if (!isExternalHosting(hosting)) {
    return <SiteDomainPanel repoId={repoId} top={hostingCard} />;
  }

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight">Domain</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          This site is hosted on {HOSTING_LABELS[hosting]}. Its domain is
          managed there. Every publish pushes your changes to GitHub and{" "}
          {HOSTING_LABELS[hosting]} deploys them.
        </p>
      </div>
      {hostingCard}
      {websiteUrl && (
        <div className="bg-card text-muted-foreground rounded-lg border px-4 py-3 text-[13px]">
          Live at{" "}
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-medium hover:underline"
          >
            {websiteUrl}
          </a>
        </div>
      )}
    </div>
  );
}

/** Where the live site is served, plus its URL when external. Editable by
 * the project owner or an admin; everyone else sees it read-only. */
function HostingCard({
  repoId,
  hosting,
  websiteUrl,
  canHostElsewhere,
  canEdit,
}: {
  repoId: number;
  hosting: Hosting;
  websiteUrl: string | null;
  canHostElsewhere: boolean;
  canEdit: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { config } = useConfig();
  const [value, setValue] = useState<Hosting>(hosting);
  const [url, setUrl] = useState("");
  useEffect(() => setValue(hosting), [hosting]);
  useEffect(() => {
    setUrl(isExternalHosting(hosting) ? (websiteUrl ?? "") : "");
  }, [hosting, websiteUrl]);

  const save = useMutation(
    trpc.project.setHosting.mutationOptions({
      onSuccess: async () => {
        toast.success("Hosting saved.");
        clearWebsiteUrlCache(config?.owner, config?.repo);
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const external = isExternalHosting(value);
  const dirty =
    value !== hosting || (external && url.trim() !== (websiteUrl ?? ""));

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b p-4">
        <h3 className="text-[16px] font-extrabold tracking-tight">Hosting</h3>
        <p className="text-muted-foreground mt-1 text-[13px]">
          {!canHostElsewhere
            ? "Uploaded projects are always hosted on Content Pilot."
            : canEdit
              ? "Where the live site is served. On another host, publishing only pushes to GitHub and that host deploys it."
              : "Where the live site is served. Only the project owner can change this."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Select
          value={value}
          disabled={!canHostElsewhere || !canEdit}
          onValueChange={(next) =>
            setValue((next as Hosting) ?? "content-pilot")
          }
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue>{(v) => hostingOptionLabel(v as Hosting)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {HOSTING_VALUES.map((option) => (
              <SelectItem key={option} value={option}>
                {hostingOptionLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {external && (
          <Input
            placeholder="www.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
            className="min-w-56 flex-1"
          />
        )}
        {canEdit && canHostElsewhere && (
          <Button
            isLoading={save.isPending}
            disabled={!canHostElsewhere || !dirty || (external && !url.trim())}
            onClick={() =>
              save.mutate({
                repoId,
                hosting: value,
                ...(external ? { websiteUrl: url } : {}),
              })
            }
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
}

const hostingOptionLabel = (value: Hosting) =>
  value === "other" ? "Other" : HOSTING_LABELS[value];

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

function SiteDomainPanel({
  repoId,
  top,
}: {
  repoId: number;
  /** Rendered under the heading (the admin Hosting card). */
  top?: ReactNode;
}) {
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
          toast.info(
            "Your CNAME points somewhere else. Check the value below."
          );
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
    <div className="mx-auto w-full max-w-screen-lg space-y-6 p-6">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight">Domain</h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Your site is always online. Give it a nicer address with a free
          subdomain, or connect your own domain.
        </p>
      </div>

      {top}

      {!data ? (
        <div className="bg-card flex justify-center rounded-lg border py-14">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      ) : (
        <>
          {/* Free subdomain */}
          <div className="bg-card rounded-lg border">
            <div className="border-b p-4">
              <h3 className="text-[16px] font-extrabold tracking-tight">
                Free subdomain
              </h3>
              <p className="text-muted-foreground mt-1 text-[13px]">
                Pick a name and your site is live at it instantly. No DNS setup
                needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex min-w-56 flex-1 items-center">
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
                disabled={busy || slugInput.trim() === (data.free?.slug ?? "")}
                onClick={() => setSlug.mutate({ repoId, slug: slugInput })}
              >
                Save
              </Button>
            </div>
            {data.free && (
              <div className="text-muted-foreground border-t px-4 py-3 text-[13px]">
                Live at{" "}
                <a
                  href={data.free.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  {data.free.url}
                </a>
              </div>
            )}
          </div>

          {/* Custom domain */}
          <ProjectFeatureGate feature="domain">
            <div className="bg-card rounded-lg border">
              {!data.custom ? (
                <>
                  <div className="border-b p-4">
                    <h3 className="text-[16px] font-extrabold tracking-tight">
                      Custom domain
                    </h3>
                    <p className="text-muted-foreground mt-1 text-[13px]">
                      Enter a subdomain like{" "}
                      <span className="font-medium">www.yourdomain.com</span>.
                      Root domains are not supported yet. Set up a redirect from
                      your root domain to www at your registrar.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <Input
                      placeholder="www.yourdomain.com"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      className="min-w-56 flex-1"
                    />
                    <Button
                      isLoading={addDomain.isPending}
                      disabled={
                        busy ||
                        !domainInput.trim() ||
                        !data.customDomainsConfigured
                      }
                      onClick={() =>
                        addDomain.mutate({ repoId, domain: domainInput })
                      }
                    >
                      Add
                    </Button>
                  </div>
                  {!data.customDomainsConfigured && (
                    <div className="text-muted-foreground border-t px-4 py-3 text-[13px]">
                      Custom domains are not configured on this server.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-extrabold tracking-tight">
                        {data.custom.domain}
                      </h3>
                      {statusBadge(data.custom.status)}
                    </div>
                    <div className="flex items-center gap-2">
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
                        className={
                          data.custom.status === "pending"
                            ? "text-destructive"
                            : ""
                        }
                        isLoading={removeDomain.isPending}
                        disabled={busy}
                        onClick={() => removeDomain.mutate({ repoId })}
                      >
                        {data.custom.status === "pending" ? "Cancel" : "Remove"}
                      </Button>
                    </div>
                  </div>

                  {data.custom.status === "pending" && (
                    <>
                      <p className="text-muted-foreground px-4 pt-4 text-[13px]">
                        Add this record at your DNS provider (Namecheap,
                        GoDaddy, or wherever your domain lives), then verify.
                        DNS changes can take up to an hour.
                      </p>
                      <div className="p-4">
                        <div className="overflow-hidden rounded-lg border">
                          <div className="text-muted-foreground bg-muted/40 grid grid-cols-[4rem_1fr_1fr] gap-x-4 border-b px-4 py-2 text-[12px] font-semibold">
                            <span>Type</span>
                            <span>Name</span>
                            <span>Value</span>
                          </div>
                          <div className="grid grid-cols-[4rem_1fr_1fr] items-center gap-x-4 px-4 py-3 text-[13px]">
                            <span className="font-mono">
                              {data.custom.dns.type}
                            </span>
                            <span className="flex min-w-0 items-center gap-1">
                              <span className="truncate font-mono">
                                {data.custom.dns.name}
                              </span>
                              <CopyChip value={data.custom.dns.name} />
                            </span>
                            <span className="flex min-w-0 items-center gap-1">
                              <span className="truncate font-mono">
                                {data.custom.dns.value}
                              </span>
                              <CopyChip value={data.custom.dns.value} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {data.custom.status === "active" && (
                    <div className="text-muted-foreground px-4 py-3 text-[13px]">
                      Live at{" "}
                      <a
                        href={`https://${data.custom.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium hover:underline"
                      >
                        https://{data.custom.domain}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </ProjectFeatureGate>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import {
  buildCampaignUrl,
  CAMPAIGN_URL_PRESETS,
} from "@/lib/campaign-url";
import { useAgency } from "@/components/agency/use-agency";
import { Copy } from "@/components/icon";

/**
 * Google's Campaign URL Builder, inline: utm-tagged link for a campaign,
 * prefilled with the client's website and the ads campaign id (utm_id).
 */
export function CampaignUrlDialog({
  open,
  onOpenChange,
  campaign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: { id: string; name: string };
}) {
  const { websiteUrl } = useAgency();
  const [form, setForm] = useState({
    url: websiteUrl ?? "",
    source: "",
    medium: "",
    campaign: campaign.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    term: "",
    content: "",
  });
  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const url = buildCampaignUrl({ ...form, id: campaign.id });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tracking link</DialogTitle>
          <DialogDescription>
            Share this link on a channel, and visits plus leads from it carry
            the campaign. utm_id is set to this campaign ({campaign.id}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {CAMPAIGN_URL_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
                  form.source === preset.source &&
                    form.medium === preset.medium
                    ? "border-[#fc8464]/50 bg-[#fc8464]/10 text-[#c2522f] dark:text-[#fc8464]"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    source: preset.source,
                    medium: preset.medium,
                  }))
                }
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-url">Landing page</Label>
            <Input
              id="cu-url"
              value={form.url}
              placeholder="https://example.com/"
              onChange={set("url")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-source">Source</Label>
              <Input
                id="cu-source"
                value={form.source}
                placeholder="instagram"
                onChange={set("source")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-medium">Medium</Label>
              <Input
                id="cu-medium"
                value={form.medium}
                placeholder="social"
                onChange={set("medium")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-campaign">Campaign name</Label>
              <Input
                id="cu-campaign"
                value={form.campaign}
                placeholder="spring-sale"
                onChange={set("campaign")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-content">Content (optional)</Label>
              <Input
                id="cu-content"
                value={form.content}
                placeholder="story-link"
                onChange={set("content")}
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl border p-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
              Generated URL
            </p>
            <p className="mt-1.5 text-[13px] break-all">
              {url ?? (
                <span className="text-muted-foreground">
                  Fill in the landing page, source and medium.
                </span>
              )}
            </p>
            <Button
              size="sm"
              className="mt-3"
              disabled={!url}
              onClick={() =>
                url &&
                navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success("Tracking link copied."))
                  .catch(() => toast.error("Couldn't copy."))
              }
            >
              <Copy className="size-3.5" />
              Copy link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

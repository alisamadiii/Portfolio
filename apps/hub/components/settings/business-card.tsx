"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { BUSINESS_LIMITS } from "@workspace/trpc/lib/project-business-shared";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Field, Input, Textarea } from "@/components/ds/ui/field";

const EMPTY = { name: "", phone: "", address: "", hours: "" };

/**
 * The business details every app reads (hub_project): name, phone, address
 * and hours. One card for project Settings and Business info › Your
 * business. Feeds the [[business …]] template placeholders, appointments
 * booked from Leads, the review page and the site switcher. Owner or admin
 * edits; everyone else sees it read-only.
 */
export function BusinessCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const business = useQuery(trpc.project.business.get.queryOptions({ projectId }));
  const canEdit = business.data?.canEdit ?? false;

  const [draft, setDraft] = useState(EMPTY);
  useEffect(() => {
    if (!business.data) return;
    const b = business.data;
    setDraft({ name: b.name ?? "", phone: b.phone ?? "", address: b.address ?? "", hours: b.hours ?? "" });
  }, [business.data]);

  const save = useMutation(
    trpc.project.business.set.mutationOptions({
      onSuccess: async () => {
        toast.success("Business details saved.");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.project.business.pathKey() }),
          // The switcher and page titles show the name.
          queryClient.invalidateQueries({ queryKey: trpc.cms.repos.listMine.queryKey() }),
        ]);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const saved = business.data;
  const dirty =
    !!saved &&
    (draft.name.trim() !== (saved.name ?? "") ||
      draft.phone.trim() !== (saved.phone ?? "") ||
      draft.address.trim() !== (saved.address ?? "") ||
      draft.hours.trim() !== (saved.hours ?? ""));
  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <Card>
      <CardHeader title="Business details" divided />
      {business.isPending ? (
        <div className="p-6">
          <Skeleton className="h-64 w-full rounded-inner" />
        </div>
      ) : (
        <form
          className="flex flex-col gap-5 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) save.mutate({ projectId, ...draft });
          }}
        >
          <p className="text-[13px] text-dim">
            {canEdit
              ? "Used across the hub: templates and appointments in Leads, your review page, and emails sent on your behalf."
              : "Only the site owner can change this in Settings."}
          </p>
          {canEdit && (
            <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-[13px] text-dim">
              Don&apos;t want to type these? Find your business under{" "}
              <a href="#google-listing" className="font-medium text-coral-text underline-offset-2 hover:underline">
                Google listing
              </a>{" "}
              below and every field fills in from Google.
            </p>
          )}
          <Field label="Business name" hint="The name customers know you by.">
            <Input
              value={draft.name}
              maxLength={BUSINESS_LIMITS.name}
              placeholder="Acme Plumbing"
              disabled={!canEdit}
              onChange={set("name")}
            />
          </Field>
          <Field label="Phone" optional>
            <Input
              type="tel"
              value={draft.phone}
              maxLength={BUSINESS_LIMITS.phone}
              placeholder="(555) 123-4567"
              disabled={!canEdit}
              onChange={set("phone")}
              className="max-w-xs"
            />
          </Field>
          <Field label="Address" optional hint="Appointments booked from Leads default to it.">
            <Input
              value={draft.address}
              maxLength={BUSINESS_LIMITS.address}
              placeholder="123 Main St, Orlando, FL 32801"
              disabled={!canEdit}
              onChange={set("address")}
            />
          </Field>
          <Field label="Opening hours" optional hint="One line per day works best.">
            <Textarea
              rows={3}
              value={draft.hours}
              maxLength={BUSINESS_LIMITS.hours}
              placeholder={"Mon to Fri, 9am to 5pm\nSat, 10am to 2pm"}
              disabled={!canEdit}
              onChange={set("hours")}
            />
          </Field>
          {canEdit && (
            <div>
              <Button type="submit" variant="primary" disabled={!dirty || save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </form>
      )}
    </Card>
  );
}

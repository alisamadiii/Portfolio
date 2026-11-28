"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { DocsLink } from "@/components/ds/ui/docs-link";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";

/**
 * The project's Google listing (hub_project.googlePlaceId + the Business
 * Profile review link). Feedback sends 5-star customers there and Google
 * Reviews syncs its reviews; both apps fill this in when you connect them.
 */
export function GoogleBusinessCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const business = useQuery(trpc.project.business.get.queryOptions({ projectId }));
  const [changing, setChanging] = useState(false);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.project.business.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.googleReviews.pathKey() }),
    ]);
  const setPlace = useMutation(
    trpc.project.business.setPlace.mutationOptions({
      onSuccess: async () => {
        toast.success("Google listing saved.");
        setChanging(false);
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const setUrl = useMutation(
    trpc.project.business.set.mutationOptions({
      onSuccess: async () => {
        toast.success("Google review link saved.");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const b = business.data;
  const canEdit = b?.canEdit ?? false;
  const showSearch = !!b && (!b.googlePlaceId || changing);

  return (
    <Card id="google-listing" className="scroll-mt-20">
      <CardHeader
        title="Google listing"
        divided
        action={
          canEdit &&
          b?.googlePlaceId && (
            <Button size="sm" variant="ghost" onClick={() => setChanging((v) => !v)}>
              {changing ? "Cancel" : "Change listing"}
            </Button>
          )
        }
      />
      {!b ? (
        <div className="p-6">
          <Skeleton className="h-32 w-full rounded-inner" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-[13px] text-dim">
            Your business on Google Maps. Feedback sends happy customers here and Google Reviews reads its reviews;
            both fill this in automatically when you connect them.
          </p>
          {b.googlePlaceId && !changing && (
            <div className="flex flex-col gap-2 rounded-inner border border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="size-4 text-dim" aria-hidden />
                <span className="text-sm text-ink">{b.name || "Your listing"}</span>
                {b.address && <span className="truncate text-[13px] text-dim">{b.address}</span>}
              </div>
              <span className="truncate text-[13px] text-dim">Place id: {b.googlePlaceId}</span>
              <div className="flex flex-wrap gap-2">
                {b.mapsUrl && (
                  <ButtonAnchor
                    size="sm"
                    href={b.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<ExternalLink className="size-4" />}
                  >
                    Open on Google Maps
                  </ButtonAnchor>
                )}
                {b.writeReviewUrl && (
                  <ButtonAnchor
                    size="sm"
                    href={b.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    icon={<Star className="size-4" />}
                  >
                    Write a review
                  </ButtonAnchor>
                )}
              </div>
            </div>
          )}
          {showSearch &&
            (canEdit ? (
              <PlaceSearch
                projectId={projectId}
                defaultQuery={[b.name, b.address].filter(Boolean).join(", ")}
                currentPlaceId={b.googlePlaceId}
                picking={setPlace.isPending}
                onPick={(placeId) => setPlace.mutate({ projectId, placeId })}
              />
            ) : (
              <p className="text-sm text-dim">No Google listing yet. Only the site owner can set it.</p>
            ))}
          {b.googlePlaceId && !changing && (
            <GoogleLinkRow
              googleUrl={b.googleReviewUrl}
              canEdit={canEdit}
              saving={setUrl.isPending}
              onSave={(url) => setUrl.mutate({ projectId, googleReviewUrl: url })}
            />
          )}
        </div>
      )}
    </Card>
  );
}

/** Search Google Maps for the business and pick the listing. Shared with the Feedback app. */
export function PlaceSearch({
  projectId,
  defaultQuery,
  currentPlaceId,
  picking,
  onPick,
}: {
  projectId: string;
  defaultQuery: string;
  currentPlaceId: string | null;
  picking: boolean;
  onPick: (placeId: string) => void;
}) {
  const trpc = useTRPC();
  const [query, setQuery] = useState(defaultQuery);
  const search = useMutation(
    trpc.project.business.searchPlaces.mutationOptions({
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dim">
        Search your business name as it appears on Google, then pick your business listing (not your street
        address). <DocsLink path="client-hub/google-reviews">How it works</DocsLink>
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 2) search.mutate({ projectId, query: query.trim() });
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Your business name as it appears on Google"
          className="min-w-[240px] flex-1"
          aria-label="Business name and city"
        />
        <Button
          type="submit"
          variant="dark"
          icon={<Search className="size-4" />}
          disabled={search.isPending || query.trim().length < 2}
        >
          {search.isPending ? "Searching…" : "Search"}
        </Button>
      </form>

      {search.data && search.data.length === 0 && (
        <p className="text-sm text-dim">
          No Google business found. Search the exact name shown on Google Maps, plus your city.
        </p>
      )}
      {search.data && search.data.length > 0 && (
        <ul className="divide-y divide-divider overflow-hidden rounded-card border border-line">
          {search.data.map((p) => (
            <li key={p.placeId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-ink">{p.name || "Unnamed place"}</span>
                {p.address && <span className="truncate text-[13px] text-dim">{p.address}</span>}
              </div>
              <Button
                size="sm"
                variant={currentPlaceId === p.placeId ? "subtle" : "outline"}
                disabled={picking}
                onClick={() => onPick(p.placeId)}
              >
                {currentPlaceId === p.placeId ? "Current" : "Use this"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Paste box for the Business Profile review link (Read reviews › Get more reviews › Share). */
export function GoogleLinkForm({
  initial,
  saving,
  onSave,
  onDone,
}: {
  initial?: string;
  saving: boolean;
  onSave: (url: string) => void;
  onDone?: () => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim());
      }}
    >
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-dim">
        <li>
          Open your{" "}
          <a
            href="https://business.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral-text underline-offset-2 hover:underline"
          >
            Google Business Profile
          </a>
          .
        </li>
        <li>Select Read reviews, then Get more reviews.</li>
        <li>Select Share, copy the link and paste it here.</li>
      </ol>
      <p className="text-sm text-dim">
        <DocsLink path="client-hub/settings#google-listing">See how to set it up, step by step</DocsLink>
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://g.page/r/.../review"
          className="min-w-[240px] flex-1"
          aria-label="Google review link"
        />
        <Button type="submit" variant="dark" disabled={saving || !value.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {onDone && initial && (
          <Button variant="ghost" disabled={saving} onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** The pasted review link (where 5-star customers land), with a way to add or replace it. */
export function GoogleLinkRow({
  googleUrl,
  canEdit,
  saving,
  onSave,
}: {
  googleUrl: string | null;
  canEdit: boolean;
  saving: boolean;
  onSave: (url: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const showForm = canEdit && (editing || !googleUrl);
  return (
    <div className="flex flex-col gap-2 rounded-inner border border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink">Google review link</span>
        {googleUrl ? (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[13px] text-coral-text underline-offset-2 hover:underline"
          >
            Test it <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : (
          <span className="ml-auto text-[13px] text-dim">Not added yet</span>
        )}
      </div>
      {googleUrl && <span className="truncate text-[13px] text-dim">{googleUrl}</span>}
      {showForm ? (
        <GoogleLinkForm
          initial={googleUrl ?? undefined}
          saving={saving}
          onSave={(url) => {
            onSave(url);
            setEditing(false);
          }}
          onDone={googleUrl ? () => setEditing(false) : undefined}
        />
      ) : (
        canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="self-start text-[13px] text-coral-text underline-offset-2 hover:underline"
          >
            Change link
          </button>
        )
      )}
    </div>
  );
}

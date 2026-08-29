"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CheckIcon, CopyIcon, Trash2Icon } from "lucide-react";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

// Admin-only URL shortener manager. Data comes from /api/links (admin
// session required) — non-admins just see the forbidden state.

type ShortLink = {
  id: string;
  slug: string;
  url: string;
  clicks: number;
  createdAt: string | null;
};

async function api<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function LinksManager() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const links = useQuery({
    queryKey: ["short-links"],
    queryFn: () => api<ShortLink[]>("/api/links"),
    retry: false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["short-links"] });

  const create = useMutation({
    mutationFn: () =>
      api<ShortLink>("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...(slug && { slug }) }),
      }),
    onSuccess: () => {
      setUrl("");
      setSlug("");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<ShortLink>(`/api/links?id=${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const copy = (linkSlug: string) => {
    navigator.clipboard.writeText(`${location.origin}/${linkSlug}`);
    setCopied(linkSlug);
    setTimeout(() => setCopied(null), 1500);
  };

  if (links.isError) {
    return (
      <p className="text-muted-foreground py-24 text-center text-sm">
        {links.error.message === "Forbidden"
          ? "Admins only — sign in with an admin account."
          : links.error.message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (url) create.mutate();
        }}
      >
        <Input
          type="url"
          required
          placeholder="https://long-url.com/very/long/path"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="custom slug (optional)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          pattern="[a-zA-Z0-9\-]{3,32}"
          className="sm:w-48"
        />
        <Button type="submit" disabled={create.isPending || !url}>
          {create.isPending ? "Creating…" : "Shorten"}
        </Button>
      </form>
      {create.isError && (
        <p className="text-destructive -mt-6 text-sm">
          {create.error.message}
        </p>
      )}

      <div className="flex flex-col divide-y rounded-xl border">
        {links.isPending && (
          <p className="text-muted-foreground p-6 text-sm">Loading…</p>
        )}
        {links.data?.length === 0 && (
          <p className="text-muted-foreground p-6 text-sm">No links yet.</p>
        )}
        {links.data?.map((link) => (
          <div key={link.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <a
                  href={`/${link.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-semibold hover:underline"
                >
                  /{link.slug}
                </a>
                <button
                  type="button"
                  onClick={() => copy(link.slug)}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "size-7",
                  })}
                  aria-label="Copy short URL"
                >
                  {copied === link.slug ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </button>
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {link.url}
              </p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {link.clicks} clicks
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive size-7 shrink-0"
              disabled={remove.isPending}
              onClick={() => remove.mutate(link.id)}
              aria-label="Delete link"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

export default function LinksPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto w-full max-w-3xl px-8 py-20">
        <h1 className="mb-8 text-3xl font-bold">Short Links</h1>
        <LinksManager />
      </main>
    </QueryClientProvider>
  );
}

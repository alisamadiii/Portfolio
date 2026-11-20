"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { Badge } from "@/components/ds/ui/badge";
import { Button } from "@/components/ds/ui/button";
import { Card } from "@/components/ds/ui/card";
import { DataTable, type Column } from "@/components/ds/ui/data-table";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { money } from "@/components/uber-eats/format";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { centsToInput, parsePrice, PRODUCT_STATUS } from "./format";

type Store = NonNullable<RouterOutputs["shopify"]["get"]["store"]>;
type Product = RouterOutputs["shopify"]["products"]["items"][number];
type Variant = RouterOutputs["shopify"]["product"]["variants"][number];

export function ProductsTab({ fullAccess }: { store: Store; fullAccess: boolean }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({
    ...trpc.shopify.products.queryOptions({ projectId, cursor: cursors.at(-1), search: query || undefined }),
    retry: false,
    placeholderData: keepPreviousData,
  });

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Product",
      width: "minmax(220px, 2fr)",
      cell: (p) => (
        <div className="flex items-center gap-3 py-2">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt="" className="size-10 shrink-0 rounded-[6px] border border-line object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-line bg-canvas">
              <Package className="size-4 text-dim" />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-ink">{p.title}</span>
            <span className="text-[13px] text-dim">
              {p.variantCount} {p.variantCount === 1 ? "variant" : "variants"}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (p) => {
        const s = PRODUCT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      key: "stock",
      header: "In stock",
      width: "110px",
      align: "end",
      cell: (p) => <span className={cn("tabular-nums", p.totalInventory == null ? "text-faint" : "text-ink")}>{p.totalInventory ?? "—"}</span>,
    },
    {
      key: "price",
      header: "Price",
      width: "150px",
      align: "end",
      cell: (p) => (
        <span className="font-medium tabular-nums text-ink">
          {p.minPriceCents === p.maxPriceCents
            ? money(p.minPriceCents, p.currency)
            : `${money(p.minPriceCents, p.currency)} – ${money(p.maxPriceCents, p.currency)}`}
        </span>
      ),
    },
  ];

  const nextCursor = list.data?.nextCursor ?? null;
  return (
    <>
      <Card className={cn(list.isPlaceholderData && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3">
          <form
            className="w-full sm:w-[280px]"
            onSubmit={(e) => {
              e.preventDefault();
              setCursors([]);
              setQuery(search.trim());
            }}
          >
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" aria-label="Search products" />
          </form>
        </div>
        {list.isPending ? (
          <div className="p-6">
            <Skeleton className="h-[180px] rounded-card" />
          </div>
        ) : list.isError ? (
          <EmptyState icon={<Package className="size-5" />} title="Couldn't load products" text={handleCmsError(list.error, "Try again in a moment.")} />
        ) : (
          <DataTable
            columns={columns}
            rows={list.data.items}
            rowKey={(p) => p.id}
            minWidth={640}
            onRowClick={(p) => setOpenId(p.id)}
            empty={
              <EmptyState
                icon={<Package className="size-5" />}
                title={query ? "No products match" : "No products yet"}
                text={query ? "Try another word." : "Products you add in Shopify show up here."}
              />
            }
          />
        )}
        {(cursors.length > 0 || nextCursor) && (
          <div className="flex justify-end gap-2 border-t border-divider px-6 py-3">
            <Button size="sm" disabled={cursors.length === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
              Previous
            </Button>
            <Button size="sm" disabled={!nextCursor} onClick={() => nextCursor && setCursors((c) => [...c, nextCursor])}>
              Next
            </Button>
          </div>
        )}
      </Card>
      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-[600px]">
          {openId && <ProductContent productId={openId} fullAccess={fullAccess} onClose={() => setOpenId(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductContent({ productId, fullAccess, onClose }: { productId: string; fullAccess: boolean; onClose: () => void }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const detail = useQuery(trpc.shopify.product.queryOptions({ projectId, id: productId }));

  if (detail.isPending) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Product</DialogTitle>
          <DialogDescription>Loading the product…</DialogDescription>
        </DialogHeader>
        <Skeleton className="h-[220px] rounded-card" />
      </>
    );
  }
  if (detail.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Product</DialogTitle>
          <DialogDescription>{handleCmsError(detail.error, "Couldn't load this product.")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }

  const p = detail.data;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{p.title}</DialogTitle>
        <DialogDescription>
          {fullAccess ? "Change prices and stock. Changes go live in your store right away." : "Prices and stock in your store."}
        </DialogDescription>
      </DialogHeader>
      <ul className="flex flex-col gap-3">
        {p.variants.map((v) => (
          <VariantCard key={v.id} productId={p.id} variant={v} currency={p.currency} fullAccess={fullAccess} single={p.variants.length === 1} />
        ))}
      </ul>
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}

function VariantCard({
  productId,
  variant: v,
  currency,
  fullAccess,
  single,
}: {
  productId: string;
  variant: Variant;
  currency: string | null;
  fullAccess: boolean;
  single: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [price, setPrice] = useState(centsToInput(v.priceCents));
  const [compareAt, setCompareAt] = useState(centsToInput(v.compareAtPriceCents));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.shopify.pathKey() });
  const save = useMutation(
    trpc.shopify.updateVariant.mutationOptions({
      onSuccess: () => {
        toast.success("Price saved.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Shopify didn't take the price change.")),
    })
  );

  const priceCents = parsePrice(price);
  const compareCents = compareAt.trim() ? parsePrice(compareAt) : null;
  const compareValid = !compareAt.trim() || compareCents != null;
  const changed = priceCents !== v.priceCents || compareCents !== v.compareAtPriceCents;

  return (
    <li className="flex flex-col gap-3 rounded-inner border border-line p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-ink">{single ? "Price and stock" : v.title}</span>
        {v.sku && <span className="text-[13px] text-dim">SKU {v.sku}</span>}
      </div>
      {fullAccess ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (priceCents == null || !compareValid) return;
            save.mutate({ projectId, productId, variantId: v.id, priceCents, compareAtPriceCents: compareCents });
          }}
        >
          <Field label={`Price${currency ? ` (${currency})` : ""}`} className="w-[140px]">
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Compare-at" optional className="w-[140px]">
            <Input inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
          </Field>
          <Button type="submit" size="sm" variant="primary" disabled={!changed || priceCents == null || !compareValid || save.isPending}>
            {save.isPending ? "Saving…" : "Save price"}
          </Button>
        </form>
      ) : (
        <p className="text-ink">
          {money(v.priceCents, currency)}
          {v.compareAtPriceCents != null && <span className="ml-2 text-dim line-through">{money(v.compareAtPriceCents, currency)}</span>}
        </p>
      )}
      {!v.tracked || !v.inventoryItemId ? (
        <p className="text-[13px] text-dim">Shopify doesn&apos;t track stock for this item.</p>
      ) : v.levels.length === 0 ? (
        <p className="text-[13px] text-dim">Not stocked at any location.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-inner border border-line">
          {v.levels.map((l) => (
            <StockRow key={l.locationId} inventoryItemId={v.inventoryItemId!} level={l} fullAccess={fullAccess} onSaved={invalidate} />
          ))}
        </ul>
      )}
    </li>
  );
}

function StockRow({
  inventoryItemId,
  level,
  fullAccess,
  onSaved,
}: {
  inventoryItemId: string;
  level: Variant["levels"][number];
  fullAccess: boolean;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  const [value, setValue] = useState(String(level.available));
  const save = useMutation(
    trpc.shopify.setInventory.mutationOptions({
      onSuccess: () => {
        toast.success("Stock saved.");
        onSaved();
      },
      onError: (error) => toast.error(handleCmsError(error, "Shopify didn't take the stock change.")),
    })
  );
  const qty = /^-?\d+$/.test(value.trim()) ? Number(value.trim()) : null;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-ink">{level.locationName}</span>
      {fullAccess ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (qty != null) save.mutate({ projectId, inventoryItemId, locationId: level.locationId, quantity: qty });
          }}
        >
          <Input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 text-right"
            aria-label={`Available at ${level.locationName}`}
          />
          <Button type="submit" size="sm" disabled={qty == null || qty === level.available || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : (
        <span className="tabular-nums text-ink">{level.available} available</span>
      )}
    </li>
  );
}

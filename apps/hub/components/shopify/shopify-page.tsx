"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { ShopifyLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { StatusText } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { UnderlineTabs } from "@/components/ds/ui/tabs";
import { useProject } from "@/hooks/use-project";
import { useProjectId } from "@/hooks/use-repo";
import { handleCmsError } from "@/lib/trpc-errors";

import { OrdersTab } from "./orders-tab";
import { ProductsTab } from "./products-tab";

type Store = NonNullable<RouterOutputs["shopify"]["get"]["store"]>;

const RETURN_TOASTS: Record<string, () => void> = {
  connected: () => toast.success("Shopify connected."),
  taken: () => toast.error("That store is already connected to another project."),
  denied: () => toast.error("Shopify access was declined."),
  error: () => toast.error("Couldn't connect Shopify. Try again."),
};

const TABS = ["orders", "products"] as const;

/** Shopify app: the shop's orders (ship, cancel, refund) and products (price, stock), read live from Shopify. */
export function ShopifyPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("shopify", parseAsString);
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("orders"));
  const status = useQuery(trpc.shopify.get.queryOptions({ projectId }));

  // Back from Shopify's consent screen (the api callback already did the work).
  useEffect(() => {
    if (!returned) return;
    RETURN_TOASTS[returned]?.();
    void setReturned(null);
    void queryClient.invalidateQueries({ queryKey: trpc.shopify.pathKey() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  const header = (
    <PageHeader
      title="Shopify"
      description="Orders and products from your Shopify store. Ship, cancel and refund orders, and change prices and stock, without opening Shopify."
    />
  );

  if (status.isPending) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[240px] rounded-card" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <EmptyState
            icon={<ShoppingBag className="size-5" />}
            title="Couldn't load Shopify"
            text={handleCmsError(status.error, "Try again in a moment.")}
          />
        </Card>
      </div>
    );
  }

  const data = status.data;
  return (
    <div className="flex flex-col gap-6">
      {header}
      {!data.configured ? (
        <Card>
          <EmptyState
            icon={<ShopifyLogo className="size-5 rounded-[3px]" />}
            title="Shopify isn't set up yet"
            text="The Shopify connection is still being set up on our side. Check back soon."
          />
        </Card>
      ) : !data.store ? (
        <ConnectCard fullAccess={fullAccess} />
      ) : data.store.needsReconnect ? (
        <>
          <StoreCard store={data.store} fullAccess={fullAccess} />
          <ConnectCard fullAccess={fullAccess} reconnect={data.store.shopDomain} />
        </>
      ) : (
        <>
          <StoreCard store={data.store} fullAccess={fullAccess} />
          <UnderlineTabs
            label="Shopify sections"
            value={tab}
            onChange={(id) => void setTab(id as (typeof TABS)[number])}
            items={[
              { id: "orders", label: "Orders" },
              { id: "products", label: "Products" },
            ]}
          />
          {tab === "orders" ? (
            <OrdersTab store={data.store} fullAccess={fullAccess} />
          ) : (
            <ProductsTab store={data.store} fullAccess={fullAccess} />
          )}
        </>
      )}
    </div>
  );
}

function ConnectCard({ fullAccess, reconnect }: { fullAccess: boolean; reconnect?: string }) {
  const trpc = useTRPC();
  const projectId = useProjectId();
  // ?shop= comes from Shopify's App URL (/api/shopify/install) when the owner started from Shopify.
  const [fromShopify] = useQueryState("shop", parseAsString);
  const [shop, setShop] = useState(reconnect ?? fromShopify ?? "");
  const connect = useMutation(
    trpc.shopify.connectUrl.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the Shopify connection.")),
    })
  );

  if (!fullAccess) {
    return (
      <Card>
        <EmptyState
          icon={<ShopifyLogo className="size-5 rounded-[3px]" />}
          title={reconnect ? "Shopify needs to be reconnected" : "Connect your Shopify store"}
          text={reconnect ? "Ask the site owner to reconnect Shopify." : "The site owner hasn't connected Shopify yet."}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={reconnect ? "Reconnect Shopify" : "Connect your Shopify store"} divided />
      <form
        className="flex flex-col gap-4 p-6 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (shop.trim()) connect.mutate({ projectId, shop });
        }}
      >
        <p className="text-dim">
          {reconnect
            ? "Shopify stopped accepting Client Hub's access to this store. Sign in again to restore it."
            : "Shopify asks you to sign in and allow Client Hub to manage orders, products and stock. You won't share your password with us, and customer names and addresses stay in Shopify."}
        </p>
        <Field label="Store address" hint="Find it in Shopify under Settings › Domains, ending in .myshopify.com.">
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="your-store.myshopify.com"
            autoComplete="off"
            spellCheck={false}
            disabled={!!reconnect}
            className="sm:max-w-[360px]"
          />
        </Field>
        <Button type="submit" variant="primary" className="self-start" disabled={!shop.trim() || connect.isPending}>
          {connect.isPending ? "Opening Shopify…" : reconnect ? "Reconnect Shopify" : "Connect Shopify"}
        </Button>
      </form>
    </Card>
  );
}

function StoreCard({ store, fullAccess }: { store: Store; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useProjectId();
  const [disconnecting, setDisconnecting] = useState(false);
  const disconnect = useMutation(
    trpc.shopify.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Shopify disconnected.");
        void queryClient.invalidateQueries({ queryKey: trpc.shopify.pathKey() });
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect.")),
    })
  );

  return (
    <Card>
      <div className="flex flex-col gap-4 p-6 text-sm">
        <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
          <ShopifyLogo className="size-8 shrink-0 rounded-[5px]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-ink">{store.name}</span>
            <span className="truncate text-[13px] text-dim">
              {store.shopDomain}
              {store.planName && ` · ${store.planName}`}
            </span>
          </div>
          {store.needsReconnect ? (
            <StatusText tone="danger">Needs reconnect</StatusText>
          ) : (
            <StatusText tone="success">Connected</StatusText>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonAnchor href={store.adminUrl} target="_blank" rel="noopener noreferrer" icon={<ExternalLink className="size-4" />}>
            Open Shopify admin
          </ButtonAnchor>
          {fullAccess && (
            <button
              type="button"
              className="text-[13px] text-dim hover:text-ink hover:underline"
              onClick={() => setDisconnecting(true)}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={disconnecting}
        onOpenChange={setDisconnecting}
        title="Disconnect Shopify?"
        description="Client Hub's access to the store is removed and its orders and products stop showing here. Nothing in your Shopify store changes."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ExternalLink, MapPin, RefreshCw, RotateCcw, UtensilsCrossed } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import {
  EXCLUSION_TEXT,
  STATUS_META,
  type ExclusionCode,
  type StatusTone,
} from "@workspace/trpc/lib/doordash-constants";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { DoorDashLogo } from "@/components/ds/brand-logos";
import { PageHeader } from "@/components/ds/layout/page-header";
import { Badge, StatusText } from "@/components/ds/ui/badge";
import { Button, ButtonAnchor } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { useProject } from "@/hooks/use-project";
import { useRouteProjectId } from "@/hooks/use-repo";
import { isAdminUser } from "@/lib/authz-shared";
import { handleCmsError } from "@/lib/trpc-errors";

type Data = RouterOutputs["doordash"]["get"];
type Store = NonNullable<Data["store"]>;

const SIGNUP_URL = "https://www.doordash.com/merchant/signup";

const RETURN_TOASTS: Record<string, () => void> = {
  choose: () => toast.success("Signed in to DoorDash. Pick the store to connect."),
  nostores: () => toast.error("That DoorDash account has no stores yet."),
  notadmin: () =>
    toast.error("DoorDash needs a business admin. Sign in with the account that manages every store, then try again."),
  restarted: () => toast.success("Asked DoorDash to start over."),
  busy: () => toast.error("DoorDash is still working on the previous request. Try again in a few minutes."),
  denied: () => toast.error("DoorDash sign-in was cancelled."),
  error: () => toast.error("Couldn't connect DoorDash. Try again."),
};

/** StatusText only knows three tones; the Badge tones fold into them. */
const statusTextTone = (tone: StatusTone): "success" | "neutral" | "danger" =>
  tone === "success" ? "success" : tone === "warning" ? "danger" : "neutral";

const exclusionText = (code: string | null) =>
  code ? (EXCLUSION_TEXT[code as ExclusionCode] ?? `DoorDash reported: ${code.replaceAll("_", " ").toLowerCase()}.`) : null;

/** DoorDash app: connect a store through DoorDash's sign-in and follow the onboarding request. */
export function DoorDashPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const fullAccess = useProject()?.role === "full-access";
  const [returned, setReturned] = useQueryState("doordash", parseAsString);
  const status = useQuery({
    ...trpc.doordash.get.queryOptions({ projectId }),
    // A request in flight at DoorDash: re-read every minute until it settles.
    refetchInterval: (q) => (q.state.data?.store && !q.state.data.store.final ? 60_000 : false),
  });

  // Back from DoorDash's sign-in (the api callback already did the work).
  useEffect(() => {
    if (!returned) return;
    RETURN_TOASTS[returned]?.();
    void setReturned(null);
    void queryClient.invalidateQueries({ queryKey: trpc.doordash.pathKey() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned]);

  const header = (
    <PageHeader
      title="DoorDash"
      description="Connect your DoorDash store to Client Hub. Sign in once, pick the store, and follow DoorDash's progress here."
      docs="client-hub/doordash"
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
            icon={<UtensilsCrossed className="size-5" />}
            title="Couldn't load DoorDash"
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
            icon={<DoorDashLogo className="size-5 rounded-[3px]" />}
            title="DoorDash isn't set up yet"
            text="The DoorDash connection is still being set up on our side. Check back soon."
          />
        </Card>
      ) : data.store ? (
        <StatusCard store={data.store} env={data.env} fullAccess={fullAccess} />
      ) : data.pending ? (
        <StorePicker stores={data.pending} fullAccess={fullAccess} />
      ) : (
        <ConnectCard fullAccess={fullAccess} env={data.env} />
      )}
    </div>
  );
}

function ConnectCard({ fullAccess, env }: { fullAccess: boolean; env: Data["env"] }) {
  const trpc = useTRPC();
  const projectId = useRouteProjectId();
  const connect = useMutation(
    trpc.doordash.connectUrl.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't start the DoorDash sign-in.")),
    })
  );

  return (
    <Card>
      <EmptyState
        icon={<DoorDashLogo className="size-5 rounded-[3px]" />}
        title="Connect your DoorDash store"
        text={
          fullAccess
            ? "Sign in with the DoorDash account that manages your restaurant. DoorDash asks you to allow Client Hub to see your stores; you won't share your password with us."
            : "The site owner hasn't connected DoorDash yet."
        }
        action={
          fullAccess ? (
            <div className="flex flex-col items-center gap-3">
              <Button variant="primary" disabled={connect.isPending} onClick={() => connect.mutate({ projectId })}>
                {connect.isPending ? "Opening DoorDash…" : "Connect DoorDash"}
              </Button>
              <ButtonAnchor href={SIGNUP_URL} target="_blank" rel="noopener noreferrer" size="sm" variant="ghost">
                New to DoorDash? Sign up
              </ButtonAnchor>
            </div>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-2 border-t border-divider px-6 py-3 text-[13px] text-dim">
        <p>
          If this store already sends DoorDash orders to another POS or integration, connecting it here replaces that
          integration once it goes live.
        </p>
        {env === "sandbox" && <p>Test mode: connected to DoorDash&apos;s test environment, not live stores.</p>}
      </div>
    </Card>
  );
}

const pickerSchema = z.object({
  decisionMakerEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
});
type PickerValues = z.infer<typeof pickerSchema>;

function StorePicker({ stores, fullAccess }: { stores: NonNullable<Data["pending"]>; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const [picked, setPicked] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PickerValues>({
    // Same cast as company.tsx: hoisted zod v4 types leak into the resolver
    // signature while the app itself is on zod v3.
    resolver: zodResolver(pickerSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: { decisionMakerEmail: "" },
  });
  const start = useMutation(
    trpc.doordash.startOnboarding.mutationOptions({
      onSuccess: () => {
        toast.success("Request sent. DoorDash takes it from here.");
        void queryClient.invalidateQueries({ queryKey: trpc.doordash.pathKey() });
      },
      onError: (error) => {
        toast.error(handleCmsError(error, "DoorDash didn't accept the request."));
        void queryClient.invalidateQueries({ queryKey: trpc.doordash.pathKey() });
      },
    })
  );

  const submit = (storeId: string) =>
    handleSubmit((values) => {
      setPicked(storeId);
      start.mutate({ projectId, storeId, decisionMakerEmail: values.decisionMakerEmail || undefined });
    })();

  const eligible = stores.filter((s) => s.eligible).length;

  return (
    <Card>
      <CardHeader title="Which DoorDash store is this website for?" divided />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <p className="text-dim">
          These are the stores your DoorDash account manages. Pick the one this site belongs to; the others can
          connect from their own projects. Greyed-out stores can&apos;t be connected right now, DoorDash says.
        </p>
        <ul className="flex flex-col divide-y divide-divider rounded-inner border border-line">
          {stores.map((s) => (
            <li
              key={s.storeId}
              className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !s.eligible && "opacity-60")}
            >
              <MapPin className="size-4 shrink-0 text-dim" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-ink">{s.name}</span>
                <span className="truncate text-[13px] text-dim">
                  {[s.address, s.businessName].filter(Boolean).join(" · ") || s.storeId}
                </span>
              </div>
              {!s.eligible ? (
                <Badge tone="neutral">Not eligible</Badge>
              ) : (
                fullAccess && (
                  <Button size="sm" variant="primary" disabled={start.isPending} onClick={() => void submit(s.storeId)}>
                    {start.isPending && picked === s.storeId ? "Sending…" : "Use this store"}
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
        {eligible === 0 && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            None of these stores can be connected right now. Check with DoorDash merchant support, then connect
            again.
          </p>
        )}
        {fullAccess && eligible > 0 && (
          <Field
            label="Who signs off on this at the restaurant?"
            optional
            hint="DoorDash emails this person if it needs a decision. Leave empty to use the DoorDash account's owner."
          >
            <Controller
              control={control}
              name="decisionMakerEmail"
              render={({ field }) => (
                <Input type="email" placeholder="owner@restaurant.com" maxLength={200} {...field} />
              )}
            />
            {errors.decisionMakerEmail && (
              <span className="mt-1 block text-[13px] text-danger">{errors.decisionMakerEmail.message}</span>
            )}
          </Field>
        )}
        <p className="text-[13px] text-dim">
          Connecting replaces any other POS integration the store has on DoorDash. This choice expires after 30
          minutes; after that, press Connect again.
        </p>
      </div>
    </Card>
  );
}

function StatusCard({ store, env, fullAccess }: { store: Store; env: Data["env"]; fullAccess: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectId = useRouteProjectId();
  const admin = isAdminUser(useCurrentUser().data?.user);
  const [disconnecting, setDisconnecting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.doordash.pathKey() });
  const refresh = useMutation(
    trpc.doordash.refresh.mutationOptions({
      onSuccess: () => {
        toast.success("Up to date.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't refresh.")),
    })
  );
  const restart = useMutation(
    trpc.doordash.restart.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) => toast.error(handleCmsError(error, "Couldn't restart.")),
    })
  );
  const disconnect = useMutation(
    trpc.doordash.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("DoorDash disconnected.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't disconnect.")),
    })
  );
  const reset = useMutation(
    trpc.doordash.resetOnboarding.mutationOptions({
      onSuccess: () => {
        toast.success("Test onboarding reset.");
        void invalidate();
      },
      onError: (error) => toast.error(handleCmsError(error, "Couldn't reset.")),
    })
  );

  const meta = STATUS_META[store.onboardingStatus];
  const exclusion = exclusionText(store.exclusionCode);
  const menuWait = store.onboardingStatus === "MENU_BLOCK" || store.exclusionCode === "MENU_PULLING_REQUEST_FAILURE";

  return (
    <Card>
      <CardHeader
        title="Your store"
        divided
        action={
          fullAccess && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />}
                disabled={refresh.isPending}
                onClick={() => refresh.mutate({ projectId })}
              >
                Refresh
              </Button>
              {store.canRestart && (
                <Button
                  size="sm"
                  variant="dark"
                  icon={<RotateCcw className="size-4" />}
                  disabled={restart.isPending}
                  onClick={() => restart.mutate({ projectId })}
                >
                  {restart.isPending ? "Opening DoorDash…" : "Restart"}
                </Button>
              )}
            </div>
          )
        }
      />
      <div className="flex flex-col gap-4 p-6 text-sm">
        <div className="flex flex-wrap items-center gap-3 rounded-inner border border-line px-4 py-3">
          <DoorDashLogo className="size-8 shrink-0 rounded-[5px]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-ink">{store.name}</span>
            <span className="truncate text-[13px] text-dim">
              {[store.address, store.businessName].filter(Boolean).join(" · ") || store.storeId}
            </span>
          </div>
          <StatusText tone={statusTextTone(meta.tone)}>{meta.label}</StatusText>
        </div>

        <div className="flex flex-col gap-2 rounded-inner border border-line bg-canvas px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
            <span className="text-[13px] text-dim">
              {store.lastEventAt
                ? `Updated ${formatDistanceToNow(parseISO(store.lastEventAt), { addSuffix: true })}`
                : "No update from DoorDash yet"}
              {env === "sandbox" && " · test mode"}
            </span>
          </div>
          <p className="text-ink">{meta.text}</p>
          {exclusion && <p className="text-dim">{exclusion}</p>}
          {store.statusDetails && <p className="text-dim">DoorDash says: {store.statusDetails}</p>}
          {menuWait && (
            <p className="text-dim">
              Menus aren&apos;t available from Client Hub yet. We&apos;ll finish the connection once they are; nothing to
              do on your side.
            </p>
          )}
        </div>

        {store.lastError && (
          <p className="rounded-inner border border-line bg-canvas px-4 py-3 text-dim">
            The last check didn&apos;t finish. DoorDash sends updates on its own, or press Refresh.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {store.menuPreviewUrl && (
            <ButtonAnchor
              href={store.menuPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLink className="size-4" />}
            >
              Preview menu on DoorDash
            </ButtonAnchor>
          )}
          {store.decisionMakerEmail && (
            <span className="text-[13px] text-dim">DoorDash emails {store.decisionMakerEmail} about this request.</span>
          )}
        </div>

        {fullAccess && (
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="text-[13px] text-dim hover:text-ink hover:underline"
              onClick={() => setDisconnecting(true)}
            >
              Disconnect
            </button>
            {admin && env === "sandbox" && (
              <button
                type="button"
                className="text-[13px] text-dim hover:text-ink hover:underline"
                onClick={() => setResetting(true)}
              >
                Admin: reset test onboarding
              </button>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={disconnecting}
        onOpenChange={setDisconnecting}
        title="Disconnect DoorDash?"
        description="The store is unlinked from this site. Your store on DoorDash isn't touched, and a request DoorDash is still working on carries on there. This can't be undone."
        confirmLabel="Disconnect"
        danger
        onConfirm={() => disconnect.mutate({ projectId })}
      />
      <ConfirmDialog
        open={resetting}
        onOpenChange={setResetting}
        title="Reset the test onboarding?"
        description="DoorDash forgets this onboarding request (test environments only) and the store is unlinked here, so it can be connected again from scratch."
        confirmLabel="Reset"
        danger
        onConfirm={() => reset.mutate({ projectId })}
      />
    </Card>
  );
}

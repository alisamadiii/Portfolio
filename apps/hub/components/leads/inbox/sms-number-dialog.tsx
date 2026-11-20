"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { useTRPC } from "@workspace/trpc/client";
import { formatPhone } from "@workspace/trpc/lib/inbox-shared";

import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { ConfirmDialog } from "@/components/ds/ui/confirm-dialog";
import { Input } from "@/components/ds/ui/field";
import { SegmentedTabs } from "@/components/ds/ui/tabs";

/** "PONTE VEDRA BEACH" -> "Ponte Vedra Beach" (carrier rate centers are upper case). */
const titleCase = (value: string) =>
  value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Admin only: link a number already on the agency texting account, or buy one
 * (search by area code). The current one can be disconnected or released.
 * Provider-neutral: the provider's name comes from agency.sms.status.
 */
export function SmsNumberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();
  const status = useQuery(trpc.agency.sms.status.queryOptions({ projectId }));
  const providerName = status.data?.provider.name ?? "texting provider";
  const [areaCode, setAreaCode] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [mode, setMode] = useState<"owned" | "buy">("owned");

  const owned = useQuery(
    trpc.agency.sms.ownedNumbers.queryOptions(
      { projectId },
      {
        enabled:
          open && Boolean(status.data?.configured) && !status.data?.number,
        retry: false,
      }
    )
  );

  const numbers = useQuery(
    trpc.agency.sms.searchNumbers.queryOptions(
      { projectId, ...(searched && { areaCode: searched }) },
      {
        enabled: open && searched !== null && !status.data?.number,
        retry: false,
      }
    )
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: trpc.agency.sms.pathKey() });
    void queryClient.invalidateQueries({
      queryKey: trpc.agency.inbox.thread.pathKey(),
    });
  };

  const buy = useMutation(
    trpc.agency.sms.buyNumber.mutationOptions({
      onSuccess: ({ number }) => {
        toast.success(
          `${formatPhone(number)} is now this project's texting number.`
        );
        refresh();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const link = useMutation(
    trpc.agency.sms.linkNumber.mutationOptions({
      onSuccess: ({ number }) => {
        toast.success(
          `${formatPhone(number)} is now this project's texting number.`
        );
        refresh();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const disconnect = useMutation(
    trpc.agency.sms.disconnectNumber.mutationOptions({
      onSuccess: () => {
        toast.success(
          `Number disconnected. It stays on the ${providerName} account.`
        );
        refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const release = useMutation(
    trpc.agency.sms.releaseNumber.mutationOptions({
      onSuccess: () => {
        toast.success("Number released.");
        refresh();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const current = status.data?.number;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Texting number</DialogTitle>
          <DialogDescription>
            A number on the agency {providerName} account. US carriers only
            deliver texts once a 10DLC brand and campaign are registered in{" "}
            {providerName}.
          </DialogDescription>
        </DialogHeader>

        {!status.data?.configured ? (
          <p className="text-dim text-[13px]">
            Set {status.data?.provider.envHint ?? "the texting provider keys"}{" "}
            on the api service first.
          </p>
        ) : current ? (
          <div className="rounded-inner border-line flex items-center justify-between gap-3 border px-4 py-3">
            <div className="flex flex-col">
              <span className="text-ink text-sm font-semibold">
                {formatPhone(current)}
              </span>
              <span className="text-dim text-[13px]">
                Texts and replies use this number.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate({ projectId })}
              >
                Disconnect
              </Button>
              <Button
                size="sm"
                disabled={release.isPending}
                onClick={() => setConfirmRelease(true)}
              >
                Release
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <SegmentedTabs
              label="Number source"
              value={mode}
              onChange={(id) => setMode(id as "owned" | "buy")}
              items={[
                { id: "owned", label: "Your numbers" },
                { id: "buy", label: "Buy new" },
              ]}
            />

            {mode === "owned" ? (
              <>
                {owned.error && (
                  <p className="text-danger text-[13px]">
                    {owned.error.message}
                  </p>
                )}
                {owned.isPending && (
                  <p className="text-dim text-[13px]">Loading…</p>
                )}
                {owned.data && owned.data.length === 0 && (
                  <p className="text-dim text-[13px]">
                    No numbers on the {providerName} account yet. Buy one
                    instead.
                  </p>
                )}
                {owned.data && owned.data.length > 0 && (
                  <ul className="rounded-inner border-line flex max-h-[320px] flex-col overflow-y-auto border">
                    {owned.data.map((n) => (
                      <li
                        key={n.id}
                        className="border-divider flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                      >
                        <span className="flex flex-col">
                          <span className="text-ink text-sm font-medium">
                            {formatPhone(n.phoneNumber)}
                          </span>
                          <span className="text-dim text-xs">
                            {n.usedBy
                              ? `Used by ${n.usedBy.name || "another project"}`
                              : n.profileName
                                ? `Profile: ${n.profileName}`
                                : "Not used yet"}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={link.isPending || Boolean(n.usedBy)}
                          onClick={() => setConfirmLink(n.phoneNumber)}
                        >
                          Use
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearched(areaCode.trim());
                  }}
                >
                  <Input
                    autoFocus
                    inputMode="numeric"
                    maxLength={3}
                    value={areaCode}
                    onChange={(e) =>
                      setAreaCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Area code, e.g. 904"
                    aria-label="Area code"
                  />
                  <Button
                    type="submit"
                    variant="dark"
                    disabled={areaCode.length !== 0 && areaCode.length !== 3}
                  >
                    Search
                  </Button>
                </form>

                {numbers.error && (
                  <p className="text-danger text-[13px]">
                    {numbers.error.message}
                  </p>
                )}
                {numbers.isFetching && (
                  <p className="text-dim text-[13px]">Searching…</p>
                )}
                {numbers.data && numbers.data.length === 0 && (
                  <p className="text-dim text-[13px]">
                    No numbers with texting in that area code. Try a nearby one.
                  </p>
                )}
                {numbers.data && numbers.data.length > 0 && (
                  <ul className="rounded-inner border-line flex max-h-[320px] flex-col overflow-y-auto border">
                    {numbers.data.map((n) => (
                      <li
                        key={n.phoneNumber}
                        className="border-divider flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                      >
                        <span className="flex flex-col">
                          <span className="text-ink text-sm font-medium">
                            {formatPhone(n.phoneNumber)}
                          </span>
                          <span className="text-dim text-xs">
                            {[n.locality && titleCase(n.locality), n.region]
                              .filter(Boolean)
                              .join(", ") || "United States"}
                            {Number(n.monthlyCost) > 0 &&
                              ` · $${Number(n.monthlyCost).toFixed(2)}/mo`}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={buy.isPending}
                          onClick={() => setConfirmBuy(n.phoneNumber)}
                        >
                          Buy
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          open={confirmLink !== null}
          onOpenChange={(o) => !o && setConfirmLink(null)}
          title={`Use ${formatPhone(confirmLink)}?`}
          description="Replies to this number will land in this project's Conversations."
          confirmLabel="Use number"
          onConfirm={() =>
            confirmLink && link.mutate({ projectId, phoneNumber: confirmLink })
          }
        />
        <ConfirmDialog
          open={confirmBuy !== null}
          onOpenChange={(o) => !o && setConfirmBuy(null)}
          title={`Buy ${formatPhone(confirmBuy)}?`}
          description={`${providerName} charges the agency account for this number every month until it's released.`}
          confirmLabel="Buy number"
          onConfirm={() =>
            confirmBuy && buy.mutate({ projectId, phoneNumber: confirmBuy })
          }
        />
        <ConfirmDialog
          open={confirmRelease}
          onOpenChange={setConfirmRelease}
          title={`Release ${formatPhone(current)}?`}
          description={`The number goes back to ${providerName} and can't be recovered. Leads texting it won't reach this project anymore.`}
          confirmLabel="Release number"
          danger
          onConfirm={() => release.mutate({ projectId })}
        />
      </DialogContent>
    </Dialog>
  );
}

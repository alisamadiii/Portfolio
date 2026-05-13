"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ScopeMetadataMap, ScopeType } from "@workspace/drizzle/schema";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTable } from "@workspace/ui/custom/data-table";

import { queryClient, useTRPC } from "@workspace/trpc/client";

type Scope = RouterOutputs["clients"]["get"]["scopes"][number];

// ─── Helpers ────────────────────────────────────────────────────

const getScopeLabel = (scope: Scope): string => {
  if (scope.type === "contact") {
    const meta = scope.metadata as ScopeMetadataMap["contact"];
    return meta.domain;
  }
  return scope.type;
};

// ─── Main Component ─────────────────────────────────────────────

export const ClientScopes = ({
  clientId,
  userEmail,
}: {
  clientId: string;
  userEmail: string;
}) => {
  const trpc = useTRPC();
  const { data: scopes, isLoading } = useQuery(
    trpc.scopes.listByClient.queryOptions(clientId)
  );
  const resetUsage = useMutation(trpc.scopes.resetUsageCount.mutationOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.scopes.listByClient.queryKey(clientId),
    });

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="Scopes" />
        <Skeleton className="h-32 w-full" />
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="Scopes">
        <AddScopeDialog
          clientId={clientId}
          userEmail={userEmail}
          onCreated={invalidate}
        />
      </CardAgency.Header>

      {!scopes || scopes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No scopes registered.</p>
      ) : (
        <DataTable
          columns={[
            {
              header: "Type",
              accessorKey: "type",
              cell: ({ row }) => (
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {row.original.type}
                </Badge>
              ),
            },
            {
              header: "Identifier",
              id: "identifier",
              cell: ({ row }) => (
                <span className="font-mono text-sm">
                  {getScopeLabel(row.original)}
                </span>
              ),
            },
            {
              header: "Status",
              accessorKey: "isActive",
              cell: ({ row }) => (
                <Badge variant={row.original.isActive ? "default" : "outline"}>
                  {row.original.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              header: "Usage",
              accessorKey: "usageCount",
              cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums">
                    {row.original.usageCount}
                  </span>
                  {row.original.usageCount > 0 && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        resetUsage.mutate(row.original.id, {
                          onSuccess: () => {
                            toast.success("Usage count reset");
                            invalidate();
                          },
                        })
                      }
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                </div>
              ),
            },
            {
              header: "Created",
              accessorKey: "createdAt",
              cell: ({ row }) =>
                format(new Date(row.original.createdAt), "MM/dd/yyyy"),
            },
            {
              id: "actions",
              cell: ({ row }) => (
                <div className="flex items-center gap-1">
                  <EditScopeDialog
                    scope={row.original}
                    onUpdated={invalidate}
                  />
                  <DeleteScopeDialog
                    scope={row.original}
                    onDeleted={invalidate}
                  />
                </div>
              ),
            },
          ]}
          data={scopes}
        />
      )}
    </CardAgency.Card>
  );
};

// ─── Add Scope ──────────────────────────────────────────────────

const AddScopeDialog = ({
  clientId,
  userEmail,
  onCreated,
}: {
  clientId: string;
  userEmail: string;
  onCreated: () => void;
}) => {
  const trpc = useTRPC();
  const createScope = useMutation(trpc.scopes.create.mutationOptions());
  const [open, setOpen] = useState(false);

  // Contact metadata fields
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [description, setDescription] = useState("");

  const reset = () => {
    setDomain("");
    setEmail(userEmail);
    setDescription("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-3.5" />
          Add Scope
        </Button>
      </DialogTrigger>
      <DialogContent className="animate-none!">
        <DialogHeader>
          <DialogTitle>Add Scope</DialogTitle>
          <DialogDescription>
            Add a new scope to this client.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Badge variant="secondary" className="w-fit capitalize">
              contact
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@acme.com"
              type="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!domain || !email}
            isLoading={createScope.isPending}
            onClick={() =>
              createScope.mutate(
                {
                  clientId,
                  type: "contact",
                  metadata: {
                    domain: domain
                      .toLowerCase()
                      .replace(/^(https?:\/\/)/, "")
                      .replace(/^www\./, "")
                      .replace(/\/+$/, ""),
                    email,
                    ...(description ? { description } : {}),
                  },
                },
                {
                  onSuccess: () => {
                    toast.success("Scope added");
                    setOpen(false);
                    reset();
                    onCreated();
                  },
                  onError: (error) => toast.error(error.message),
                }
              )
            }
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Edit Scope ─────────────────────────────────────────────────

const EditScopeDialog = ({
  scope,
  onUpdated,
}: {
  scope: Scope;
  onUpdated: () => void;
}) => {
  const trpc = useTRPC();
  const updateScope = useMutation(trpc.scopes.update.mutationOptions());

  // Contact fields (type-safe)
  const meta = scope.metadata as ScopeMetadataMap["contact"];
  const [domain, setDomain] = useState(meta.domain);
  const [email, setEmail] = useState(meta.email);
  const [desc, setDesc] = useState(meta.description ?? "");
  const [isActive, setIsActive] = useState(scope.isActive);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="animate-none!">
        <DialogHeader>
          <DialogTitle>Edit scope</DialogTitle>
          <DialogDescription>
            Update settings for <strong>{meta.domain}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>Active</Label>
            <Button
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsActive(!isActive)}
            >
              {isActive ? "Active" : "Inactive"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!domain || !email}
            isLoading={updateScope.isPending}
            onClick={() =>
              updateScope.mutate(
                {
                  id: scope.id,
                  metadata: {
                    domain: domain
                      .toLowerCase()
                      .replace(/^(https?:\/\/)/, "")
                      .replace(/^www\./, "")
                      .replace(/\/+$/, ""),
                    email,
                    ...(desc ? { description: desc } : {}),
                  },
                  isActive,
                },
                {
                  onSuccess: () => {
                    toast.success("Scope updated");
                    onUpdated();
                  },
                  onError: (error) => toast.error(error.message),
                }
              )
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Delete Scope ───────────────────────────────────────────────

const DeleteScopeDialog = ({
  scope,
  onDeleted,
}: {
  scope: Scope;
  onDeleted: () => void;
}) => {
  const trpc = useTRPC();
  const deleteScope = useMutation(trpc.scopes.delete.mutationOptions());
  const [confirmValue, setConfirmValue] = useState("");
  const needsConfirmation = scope.usageCount > 0;
  const confirmed = !needsConfirmation || confirmValue === "DELETE";
  const label = getScopeLabel(scope);

  return (
    <Dialog onOpenChange={() => setConfirmValue("")}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-8"
        >
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete scope</DialogTitle>
          <DialogDescription>
            This will remove <strong>{label}</strong> ({scope.type}).
            {needsConfirmation && (
              <>
                {" "}
                This scope has been used{" "}
                <strong>{scope.usageCount}</strong> time
                {scope.usageCount !== 1 && "s"}. Type <strong>DELETE</strong>{" "}
                to confirm.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {needsConfirmation && (
          <Input
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder='Type "DELETE" to confirm'
          />
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={!confirmed}
            isLoading={deleteScope.isPending}
            onClick={() =>
              deleteScope.mutate(scope.id, {
                onSuccess: () => {
                  toast.success("Scope deleted");
                  onDeleted();
                },
                onError: (error) => toast.error(error.message),
              })
            }
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

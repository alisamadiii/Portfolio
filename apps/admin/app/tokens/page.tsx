"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
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
import { DataTable } from "@workspace/ui/custom/data-table";

import { queryClient, useTRPC } from "@workspace/trpc/client";

export default function TokensPage() {
  const [description, setDescription] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientUserId, setClientUserId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const availableScopes = ["contact"] as const;

  const trpc = useTRPC();
  const { data: tokens } = useQuery(trpc.tokens.list.queryOptions());
  const createToken = useMutation(trpc.tokens.create.mutationOptions());
  const deleteToken = useMutation(trpc.tokens.delete.mutationOptions());
  const resetUsage = useMutation(trpc.tokens.resetUsageCount.mutationOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.tokens.list.queryKey() });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createToken.mutate(
      {
        description,
        clientEmail,
        clientUserId: clientUserId || undefined,
        scopes: selectedScopes as "contact"[],
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      },
      {
        onSuccess: (data) => {
          navigator.clipboard.writeText(data.token);
          toast.success("Token created and copied to clipboard");
          invalidate();
          setDescription("");
          setClientEmail("");
          setClientUserId("");
          setExpiresAt("");
          setSelectedScopes([]);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">API Tokens</h1>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-lg flex-col items-start gap-4"
      >
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (e.g. Client name — contact form)"
          required
        />
        <div className="grid w-full grid-cols-2 gap-3">
          <Input
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Client email"
            type="email"
            required
          />
          <Input
            value={clientUserId}
            onChange={(e) => setClientUserId(e.target.value)}
            placeholder="Client user ID (optional)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Scopes
          </Label>
          <div className="flex gap-4">
            {availableScopes.map((scope) => (
              <label
                key={scope}
                className="flex items-center gap-2 text-sm capitalize"
              >
                <Checkbox
                  checked={selectedScopes.includes(scope)}
                  onCheckedChange={(checked) => {
                    setSelectedScopes((prev) =>
                      checked
                        ? [...prev, scope]
                        : prev.filter((s) => s !== scope)
                    );
                  }}
                />
                {scope}
              </label>
            ))}
          </div>
        </div>
        <div className="flex w-full items-center gap-3">
          <Input
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            type="datetime-local"
            className="w-auto"
          />
          <Button
            isLoading={createToken.isPending}
            type="submit"
            disabled={selectedScopes.length === 0}
          >
            Generate Token
          </Button>
        </div>
      </form>

      <div className="mt-8">
        <DataTable
          columns={[
            {
              header: "Token",
              accessorKey: "token",
              cell: ({ row }) => {
                const token = row.original.token;
                return (
                  <button
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-xs transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(token);
                      toast.success("Token copied");
                    }}
                  >
                    {token.slice(0, 8)}…{token.slice(-4)}
                    <Copy className="size-3" />
                  </button>
                );
              },
            },
            {
              header: "Description",
              accessorKey: "description",
            },
            {
              header: "Client Email",
              accessorKey: "clientEmail",
            },
            {
              header: "User ID",
              accessorKey: "clientUserId",
              cell: ({ row }) => {
                const id = row.original.clientUserId;
                return id ? (
                  <span className="font-mono text-xs">{id.slice(0, 12)}…</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                );
              },
            },
            {
              header: "Scopes",
              accessorKey: "scopes",
              cell: ({ row }) => (
                <div className="flex gap-1">
                  {row.original.scopes.map((scope) => (
                    <Badge key={scope} variant="outline">
                      {scope}
                    </Badge>
                  ))}
                </div>
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
              header: "Expires",
              accessorKey: "expiresAt",
              cell: ({ row }) => {
                const d = row.original.expiresAt;
                if (!d)
                  return (
                    <span className="text-muted-foreground text-xs">Never</span>
                  );
                const expired = new Date(d) < new Date();
                return (
                  <span className={expired ? "text-red-500" : ""}>
                    {format(new Date(d), "MM/dd/yyyy")}
                  </span>
                );
              },
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
                  <EditTokenAction
                    token={row.original}
                    onUpdated={invalidate}
                  />
                  <DeleteTokenAction
                    token={row.original}
                    onDeleted={invalidate}
                  />
                </div>
              ),
            },
          ]}
          data={tokens || []}
        />
      </div>
    </div>
  );
}

// ─── Delete Action ───────────────────────────────────────────────

function DeleteTokenAction({
  token,
  onDeleted,
}: {
  token: { id: string; clientEmail: string; usageCount: number };
  onDeleted: () => void;
}) {
  const trpc = useTRPC();
  const deleteToken = useMutation(trpc.tokens.delete.mutationOptions());
  const [confirmValue, setConfirmValue] = useState("");
  const needsConfirmation = token.usageCount > 0;
  const confirmed = !needsConfirmation || confirmValue === "DELETE";

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
          <DialogTitle>Delete token</DialogTitle>
          <DialogDescription>
            This will permanently delete the token for{" "}
            <strong>{token.clientEmail}</strong>.
            {needsConfirmation && (
              <>
                {" "}
                This token has been used <strong>
                  {token.usageCount}
                </strong>{" "}
                time
                {token.usageCount !== 1 && "s"}. Type <strong>DELETE</strong> to
                confirm.
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
            isLoading={deleteToken.isPending}
            onClick={() =>
              deleteToken.mutate(token.id, {
                onSuccess: () => {
                  toast.success("Token deleted");
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
}

// ─── Edit Action ─────────────────────────────────────────────────

function EditTokenAction({
  token,
  onUpdated,
}: {
  token: {
    id: string;
    description: string;
    clientEmail: string;
    clientUserId: string | null;
    scopes: string[];
    expiresAt: Date | string | null;
  };
  onUpdated: () => void;
}) {
  const trpc = useTRPC();
  const updateToken = useMutation(trpc.tokens.update.mutationOptions());
  const [desc, setDesc] = useState(token.description);
  const [email, setEmail] = useState(token.clientEmail);
  const [userId, setUserId] = useState(token.clientUserId ?? "");
  const [scopes, setScopes] = useState<string[]>(token.scopes);
  const [expiresAt, setExpiresAt] = useState(() => {
    if (!token.expiresAt) return "";
    const d = new Date(token.expiresAt);
    return d.toISOString().slice(0, 16);
  });

  const availableScopes = ["contact"] as const;

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
          <DialogTitle>Edit token</DialogTitle>
          <DialogDescription>
            Update token settings for <strong>{token.clientEmail}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Client Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Client User ID</Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Scopes</Label>
            <div className="flex gap-4">
              {availableScopes.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 text-sm capitalize"
                >
                  <Checkbox
                    checked={scopes.includes(scope)}
                    onCheckedChange={(checked) => {
                      setScopes((prev) =>
                        checked
                          ? [...prev, scope]
                          : prev.filter((s) => s !== scope)
                      );
                    }}
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Expires At</Label>
            <Input
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              type="datetime-local"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={scopes.length === 0 || !email || !desc}
            isLoading={updateToken.isPending}
            onClick={() =>
              updateToken.mutate(
                {
                  id: token.id,
                  description: desc,
                  clientEmail: email,
                  clientUserId: userId || undefined,
                  scopes: scopes as "contact"[],
                  expiresAt: expiresAt
                    ? new Date(expiresAt).toISOString()
                    : null,
                },
                {
                  onSuccess: () => {
                    toast.success("Token updated");
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
}

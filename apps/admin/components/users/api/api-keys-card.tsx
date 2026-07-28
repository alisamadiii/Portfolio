"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Eye, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type { ApiKeyType } from "@alisamadiillc/agency-api";
import { CardAgency } from "@workspace/ui/agency/card-agency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { agency, unwrap } from "@/lib/agency";
import { QueryError } from "@/components/users/api/query-error";

const copyToClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value);
  toast.success("Copied to clipboard");
};

// One-time display of a full key with a copy button.
const KeyReveal = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2">
    <Input readOnly value={value} className="font-mono text-xs" />
    <Button
      variant="outline"
      size="icon"
      onClick={() => copyToClipboard(value)}
    >
      <Copy className="size-4" />
    </Button>
  </div>
);

export function ApiKeysCard() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [keyType, setKeyType] = useState<ApiKeyType>("public");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  // The worker lists every key with its owner — narrow to this user here.
  const {
    data: allKeys,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["agency", "keys"],
    queryFn: async () => unwrap(await agency.admin.keys.list()),
    enabled: !!id,
  });
  const keys = useMemo(
    () => allKeys?.filter((key) => key.userId === id),
    [allKeys, id]
  );

  const invalidateKeys = () =>
    queryClient.invalidateQueries({ queryKey: ["agency", "keys"] });

  const createKey = useMutation({
    mutationFn: async (type: ApiKeyType) =>
      unwrap(await agency.admin.keys.create({ userId: id, type })),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      invalidateKeys();
    },
    onError: (error) => toast.error(error.message),
  });

  const revealKey = useMutation({
    mutationFn: async (keyId: string) =>
      unwrap(await agency.admin.keys.reveal(keyId)),
    onSuccess: (data) => setRevealedKey(data.key),
    onError: (error) => toast.error(error.message),
  });

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) =>
      unwrap(await agency.admin.keys.revoke(keyId)),
    onSuccess: () => {
      setRevokeId(null);
      invalidateKeys();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <CardAgency.Card>
      <CardAgency.Header title="API Keys">
        <div className="flex items-center gap-2">
          {keys && <Badge variant="secondary">{keys.length}</Badge>}
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                setCreatedKey(null);
                setKeyType("public");
              }
            }}
          >
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="size-4" />
              Create key
            </DialogTrigger>
            <DialogContent>
              {createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Key created</DialogTitle>
                    <DialogDescription>
                      Copy the key now — it won&apos;t be shown again here (you
                      can still reveal it later from the list).
                    </DialogDescription>
                  </DialogHeader>
                  <KeyReveal value={createdKey} />
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API key</DialogTitle>
                    <DialogDescription>
                      Public keys only work from the user&apos;s allowed
                      origins. Server keys work from anywhere — keep them
                      secret.
                    </DialogDescription>
                  </DialogHeader>
                  <Select
                    value={keyType}
                    onValueChange={(v) => setKeyType(v as ApiKeyType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        Public (origin-checked)
                      </SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => createKey.mutate(keyType)}
                    isLoading={createKey.isPending}
                  >
                    Create key
                  </Button>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardAgency.Header>

      {isError ? (
        <QueryError
          title="Failed to load API keys"
          error={error}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : !keys || keys.length === 0 ? (
        <p className="text-muted-foreground text-sm">No API keys yet.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3",
                key.revokedAt && "opacity-50"
              )}
            >
              <div className="min-w-0">
                <p className="font-mono text-sm">{key.prefix}…</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                  {key.lastUsedAt &&
                    ` · Last used ${format(new Date(key.lastUsedAt), "MMM d, yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={key.type === "server" ? "default" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {key.type}
                </Badge>
                {key.revokedAt ? (
                  <Badge variant="destructive" className="text-[10px]">
                    revoked
                  </Badge>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Reveal key"
                      disabled={revealKey.isPending}
                      onClick={() => revealKey.mutate(key.id)}
                    >
                      {revealKey.isPending &&
                      revealKey.variables === key.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeId(key.id)}
                    >
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revealed key dialog */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => !open && setRevealedKey(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key</DialogTitle>
            <DialogDescription>
              Treat this like a password — anyone with it can use this
              user&apos;s API access.
            </DialogDescription>
          </DialogHeader>
          {revealedKey && <KeyReveal value={revealedKey} />}
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeId}
        onOpenChange={(open) => !open && setRevokeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke key</AlertDialogTitle>
            <AlertDialogDescription>
              The key stops working immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeId && revokeKey.mutate(revokeId)}
              disabled={revokeKey.isPending}
            >
              {revokeKey.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardAgency.Card>
  );
}
